"""FastAPI entry point. Serve the Vite build alongside the calculation API."""
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from pilog_cfr_dss.application.freight_desk import (
    apply_fis, default_case, evaluate, export_case, import_case, matrix,
    override, select_terms, serializable, update_route,
)
from pilog_cfr_dss.calculations.port_time import working_windows
from pilog_cfr_dss.models.freight_desk import COMMODITIES, SCHEMA, TERMS
from pilog_cfr_dss.models.risk import AGREEMENTS, BASES, PARTIES, STATUSES, STRESSES, voyage_scope
from pilog_cfr_dss.reporting.commercial_brief import commercial_brief
from pilog_cfr_dss.sources.baltic_profiles import URL as BALTIC_URL, verify_benchmarks
from pilog_cfr_dss.sources.fertilizer_reports import destination_context
from pilog_cfr_dss.sources.fearnpulse import fetch_snapshot, latest_saved, save_runtime_snapshot
from pilog_cfr_dss.sources.route_distance import port_catalog


ROOT = Path(__file__).resolve().parents[3]
LIMIT = 10_000_000
PORT_FIELDS = {"rate_mt_day", "terms", "time_basis", "draft_limit_m", "port_da_usd", "allowance_days",
               "time_margin_percent", "waiting_days", "calendar"}
PROFILE_FIELDS = {"hire_usd_day", "dwt_mt", "speed_knots", "sea_vlsfo_mt_day", "sea_lsmgo_mt_day",
                  "summer_draft_m", "grain_m3", "tpc_mt_cm", "port_vlsfo_mt_day", "port_lsmgo_mt_day",
                  "bunkers_allowance_mt", "constants_allowance_mt"}
FIELDS = {"commodity", "cargo_mt", "stowage_factor_m3_mt", "tolerance_percent", "distance_nm", "start_at",
          "bunker_delay_days", "selling_freight_usd_mt", "hire_usd_day", "other_costs", "fuel.VLSFO.value", "fuel.LSMGO.value"}
FIELDS |= {f"ports.{side}.{key}" for side in ("load", "discharge") for key in PORT_FIELDS}
FIELDS |= {f"profiles.{family}.{key}" for family in ("Handysize", "Supramax") for key in PROFILE_FIELDS}


class CaseRequest(BaseModel):
    case: dict
    edits: dict = Field(default_factory=dict)


class RouteRequest(CaseRequest):
    load: tuple[str, str]
    discharge: tuple[str, str]


class MatrixRequest(CaseRequest):
    origins: list[tuple[str, str]] = Field(min_length=1, max_length=25)
    destinations: list[tuple[str, str]] = Field(min_length=1, max_length=25)
    family: Literal["Handysize", "Supramax"]
    quantity_basis: Literal["minimum", "nominal", "maximum"] = "nominal"
    port_overrides: list[tuple[str, str, str, dict]] = Field(default_factory=list, max_length=50)


def editable_case(request):
    case = deepcopy(request.case)
    risk = request.edits.get("risk_assessment", case.get("risk_assessment"))
    for path, value in request.edits.items():
        if path == "risk_assessment":
            continue
        elif path not in FIELDS:
            raise ValueError(f"Input tidak dikenal: {path}.")
        elif path.endswith(".terms"):
            select_terms(case, path.split(".")[1], value)
        else:
            if path == "start_at" and isinstance(value, str) and len(value) == 16:
                value += ":00+00:00"
            if path.endswith(".calendar") and isinstance(value, dict):
                holidays = value.get("holidays", [])
                if not isinstance(holidays, list) or not all(isinstance(day, str) for day in holidays):
                    raise ValueError("Tanggal libur kalender tidak valid.")
                value = {**value, "holidays": [day.strip() for day in holidays if day.strip()]}
            override(case, path, value)
    if risk is None:
        case.pop("risk_assessment", None)
    elif isinstance(risk, dict):
        case["risk_assessment"] = {**risk, "scope": voyage_scope(case)} if risk.get("scope") == "confirm" else risk
    else:
        raise ValueError("Status transaksi tidak valid.")
    return case


def fearnpulse_snapshot(root):
    runtime = root / "runtime/fearnpulse"
    try:
        snapshot = fetch_snapshot()
        try:
            save_runtime_snapshot(snapshot, runtime)
        except OSError:
            pass
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return latest_saved(root, runtime), True
    return snapshot, False


def baltic_status():
    try:
        return verify_benchmarks()
    except (OSError, ValueError) as error:
        return {"url": BALTIC_URL, "checked_at": datetime.now(timezone.utc).isoformat(),
                "status": "changed" if str(error).startswith("BALTIC_BENCHMARK_CHANGED") else "unavailable"}


def create_app(root=ROOT):
    app = FastAPI(title="PILOG Freight Desk")
    port_list = port_catalog(root)

    @app.exception_handler(ValueError)
    @app.exception_handler(KeyError)
    @app.exception_handler(TypeError)
    def invalid_input(_request, error):
        return JSONResponse(status_code=422, content={"detail": str(error)})

    @app.get("/api/v1/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/v1/catalog")
    def catalog():
        return {"ports": port_list, "commodities": COMMODITIES, "terms": serializable(TERMS),
                "work_windows": {code: {str(i): working_windows(code, i) for i in range(7)} for code in TERMS},
                "risk": {"agreements": AGREEMENTS, "statuses": STATUSES, "bases": BASES,
                         "parties": PARTIES, "stresses": STRESSES}}

    @app.get("/api/v1/cases/default")
    def new_case():
        with ThreadPoolExecutor(max_workers=2) as pool:
            market = pool.submit(fearnpulse_snapshot, root)
            baltic = pool.submit(baltic_status)
            snapshot, fallback = market.result()
            if snapshot is None:
                raise HTTPException(503, "Snapshot bunker belum tersedia.")
            case = default_case(root, snapshot)
            case["profile_source"]["live_verification"] = baltic.result()
        return {"case": serializable(case), "market_fallback": fallback}

    @app.post("/api/v1/cases/route")
    def change_route(payload: RouteRequest):
        case = editable_case(payload)
        changed = False
        for side, chosen in (("load", payload.load), ("discharge", payload.discharge)):
            if chosen not in port_list:
                raise ValueError("Pelabuhan tidak ditemukan dalam katalog.")
            current = case["ports"][side]
            if chosen != (current["name"], current["country"]):
                current.update(name=chosen[0], country=chosen[1], draft_limit_m=None)
                case["sources"].pop(f"ports.{side}.draft_limit_m", None)
                changed = True
        if changed:
            update_route(case, root)
            apply_fis(case, case.get("hire_snapshot"))
        return {"case": serializable(case)}

    @app.post("/api/v1/evaluate")
    def run(payload: CaseRequest):
        case = editable_case(payload)
        result = evaluate(case)
        snapshot = case["report_snapshot"]
        destination = case["ports"]["discharge"]["country"]
        market = {"prices": destination_context(snapshot, case["commodity"], destination),
                  "voyages": [item for item in snapshot["records"] if item["kind"] == "freight"
                              and item["product"] in (case["commodity"], "dry_bulk_fertilizer")]}
        return {"case": serializable(result["case"]), "result": serializable(result), "brief": commercial_brief(result),
                "market": serializable(market), "package_format": SCHEMA}

    @app.post("/api/v1/matrix")
    def spread(payload: MatrixRequest):
        if any(port not in port_list for port in payload.origins + payload.destinations):
            raise ValueError("Pelabuhan matrix tidak ditemukan dalam katalog.")
        case = editable_case(payload)
        overrides = {(side, name, country): values for side, name, country, values in payload.port_overrides}
        cells = matrix(case, payload.origins, payload.destinations, payload.family, root, payload.quantity_basis, overrides)
        return serializable([{key: value for key, value in cell.items() if key != "result"} for cell in cells])

    @app.post("/api/v1/cases/import")
    async def open_case(request: Request):
        raw = bytearray()
        async for chunk in request.stream():
            raw.extend(chunk)
            if len(raw) > LIMIT:
                raise HTTPException(413, "Paket kasus terlalu besar.")
        return {"case": serializable(import_case(raw))}

    @app.post("/api/v1/cases/export")
    def save_case(payload: CaseRequest):
        case = import_case(export_case(editable_case(payload)))
        return Response(export_case(case), media_type="application/json",
                        headers={"Content-Disposition": 'attachment; filename="freight-case.json"'})

    build = root / "frontend/dist"
    if (build / "index.html").is_file():
        app.mount("/assets", StaticFiles(directory=build / "assets"), name="assets")

        @app.get("/", include_in_schema=False)
        def index():
            return FileResponse(build / "index.html")

    return app


app = create_app()
