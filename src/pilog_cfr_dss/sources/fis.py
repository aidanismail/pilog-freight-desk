"""Import dated FIS dry-bulk time-charter assessments from approved reports."""
from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
from uuid import uuid4

from pypdf import PdfReader


CLASS_CODES = {"Handysize": "HS7TC", "Supramax": "S11TC"}
BASKETS = {("Handysize", "Pacific"): "3TC", ("Handysize", "Atlantic"): "4TC",
           ("Supramax", "Pacific"): "3TC", ("Supramax", "Atlantic"): "3TC"}
PACIFIC = {"Indonesia", "Malaysia", "Vietnam", "Thailand", "Philippines", "Singapore",
           "China", "Japan", "South Korea", "Korea, Republic of", "Taiwan", "Brunei"}
REPORT_LIMIT = 12_000_000
ROUTE_CODES = r"HS[1-7]_38|S1[BC]|S4[AB]|S(?:2|3|5|8|9|10|15)"
REQUIRED = set(CLASS_CODES.values()) | {f"{family} {region} {count}" for (family, region), count in BASKETS.items()}


def parse_report(path: Path):
    with path.open("rb") as file:
        raw = file.read(REPORT_LIMIT + 1)
    if len(raw) > REPORT_LIMIT:
        raise ValueError("Laporan FIS terlalu besar.")
    reader = PdfReader(BytesIO(raw))
    series = {}
    observed = None
    for page_no, page in enumerate(reader.pages, 1):
        page_text = page.extract_text(extraction_mode="layout")
        date_match = re.search(r"\b([A-Za-z]{3}\s+\d{1,2},\s*20\d{2})\b", page_text)
        if observed is None and date_match:
            observed = datetime.strptime(" ".join(date_match[1].split()), "%b %d, %Y").date().isoformat()

        def add(code, label, amount):
            value = int(amount.replace(",", ""))
            if value <= 0 or code in series:
                raise ValueError(f"Nilai atau seri FIS tidak valid: {code}.")
            series[code] = {"value": str(value), "unit": "USD/day", "label": label, "page": page_no}

        for line in page_text.splitlines():
            summary = re.match(r"\s*(HS7TC|S11TC|S10TC)\s*\([^)]*\)\s+([\d,]+)\s", line)
            if summary:
                add(summary[1], summary[1], summary[2])
            route = re.match(rf"\s*({ROUTE_CODES})(?:\s*\([^)]*\))?\s{{2,}}([\d,]+)\s", line)
            if route:
                add(route[1], route[1], route[2])
            regional = re.search(r"\b(Handysize|Supramax)\s+(Pacific|Atlantic)\s*([34]TC)\s+([\d,]+)\s", line)
            if regional:
                label = " ".join(regional.group(1, 2, 3))
                add(label, label, regional[4])

    if not observed or not REQUIRED <= series.keys():
        raise ValueError("Tanggal atau seri utama FIS tidak lengkap. Periksa format laporan.")
    return {"provider": "FIS", "observed_on": observed, "ingested_at": datetime.now(timezone.utc).isoformat(),
            "source_file": path.name, "source_sha256": sha256(raw).hexdigest(), "series": series}


def save_report(snapshot, folder):
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"tc-rates_{snapshot['observed_on']}.json"
    temporary = folder / f".{uuid4().hex}.tmp"
    try:
        temporary.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    return target


def latest_report(root):
    folder = root / "data/market_snapshots/fis"
    for path in sorted(folder.glob("tc-rates_*.json"), reverse=True):
        try:
            snapshot = json.loads(path.read_text(encoding="utf-8"))
            observed = datetime.fromisoformat(snapshot["observed_on"]).date().isoformat()
            datetime.fromisoformat(snapshot["ingested_at"])
            if (snapshot["provider"] == "FIS" and path.name == f"tc-rates_{observed}.json" and snapshot["source_file"]
                    and re.fullmatch(r"[a-f0-9]{64}", snapshot["source_sha256"])
                    and all(snapshot["series"][code]["unit"] == "USD/day"
                            and int(snapshot["series"][code]["value"]) > 0
                            and int(snapshot["series"][code]["page"]) > 0 for code in REQUIRED)):
                return snapshot
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return None


def select_benchmark(snapshot, family, load, discharge):
    series = snapshot["series"]
    # Both endpoints must be in the documented demo Pacific group. Cross-basin and ambiguous routes use the class average.
    if load["country"] in PACIFIC and discharge["country"] in PACIFIC:
        regional = f"{family} Pacific {BASKETS[(family, 'Pacific')]}"
        if regional in series:
            return regional, "regional_basket", "Kedua pelabuhan berada dalam kelompok Pacific pada demo."
    return CLASS_CODES[family], "class_average", "Pembanding rute dan basket regional belum terverifikasi untuk pelabuhan ini."
