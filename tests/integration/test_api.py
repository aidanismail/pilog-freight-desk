from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

from fastapi.testclient import TestClient

from pilog_cfr_dss.api.main import app
from pilog_cfr_dss.application.freight_desk import export_case, import_case
from pilog_cfr_dss.sources.fis import latest_report, parse_report, select_benchmark


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tests/fixtures/fd3_risk_pilog_open_hire.json"


class FreightApiTests(TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def opened(self):
        response = self.client.post("/api/v1/cases/import", content=FIXTURE.read_bytes())
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["case"]

    def test_import_evaluate_and_export(self):
        case = self.opened()
        response = self.client.post("/api/v1/evaluate", json={"case": case})
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertIn("Kajian beli FFA", result["brief"])
        self.assertIn("45.031,88", result["brief"])
        self.assertIn("-2.747,19", result["brief"])
        self.assertEqual(len(result["brief"].split("\n## ")), 6)
        exported = self.client.post("/api/v1/cases/export", json={"case": case})
        self.assertEqual(exported.status_code, 200, exported.text)
        self.assertEqual(import_case(exported.content), case)

    def test_scope_confirmation_applies_after_edit_and_clause_needs_reference(self):
        case = self.opened()
        risk = case["risk_assessment"]
        risk["scope"] = "confirm"
        risk["clauses"] = {"freight": {"status": "recorded"}}
        edits = {"risk_assessment": risk, "cargo_mt": "28000"}
        response = self.client.post("/api/v1/evaluate", json={"case": case, "edits": edits})
        self.assertEqual(response.status_code, 422)
        risk["clauses"]["freight"].update(reference="DEMO PI–PILOG Pasal 8", coverage="Tarif freight")
        response = self.client.post("/api/v1/evaluate", json={"case": case, "edits": edits})
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertTrue(result["result"]["risk_assessment"]["scope_matches"])
        self.assertIn("Klausul / tindak lanjut", result["brief"])

    def test_route_change_and_matrix(self):
        case = self.opened()
        load, discharge = ["Kerteh", "Malaysia"], ["Hai Phong", "Vietnam"]
        changed = self.client.post("/api/v1/cases/route", json={"case": case, "load": load, "discharge": discharge})
        self.assertEqual(changed.status_code, 200, changed.text)
        routed = changed.json()["case"]
        self.assertEqual(routed["ports"]["load"]["name"], "Kerteh")
        self.assertTrue(1150 < float(routed["distance_nm"]) < 1250)
        response = self.client.post("/api/v1/matrix", json={"case": routed, "family": "Handysize", "origins": [load], "destinations": [discharge]})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(float(response.json()[0]["delta"]), 0)

    def test_local_fis_report_when_provisioned(self):
        folder = ROOT / "data/sources/market/fis"
        source = next(folder.glob("*2026-10-30.pdf"), None)
        if source is None:
            self.skipTest("PDF historis disiapkan lokal untuk demo")
        snapshot = parse_report(source)
        self.assertEqual(snapshot["observed_on"], "2026-10-30")
        self.assertEqual(snapshot["series"]["HS7TC"]["value"], "18255")
        self.assertEqual(snapshot["series"]["S11TC"]["value"], "23569")
        self.assertEqual(snapshot["series"]["Handysize Pacific 3TC"]["value"], "18179")
        self.assertEqual(snapshot["series"]["Supramax Pacific 3TC"]["value"], "23450")
        self.assertEqual(select_benchmark(snapshot, "Handysize", {"country": "Indonesia"}, {"country": "Vietnam"})[:2],
                         ("Handysize Pacific 3TC", "regional_basket"))
        self.assertEqual(select_benchmark(snapshot, "Supramax", {"country": "Indonesia"}, {"country": "India"})[:2],
                         ("S11TC", "class_average"))
        self.assertEqual(latest_report(ROOT)["source_sha256"], snapshot["source_sha256"])

    def test_default_falls_back_when_market_sources_are_unavailable(self):
        with patch("pilog_cfr_dss.api.main.fetch_snapshot", side_effect=OSError), patch(
                "pilog_cfr_dss.api.main.verify_benchmarks", side_effect=OSError):
            response = self.client.get("/api/v1/cases/default")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["market_fallback"])
        self.assertEqual(body["case"]["profile_source"]["live_verification"]["status"], "unavailable")

    def test_legacy_benchmark_data_is_retired_without_repricing(self):
        case = self.opened()
        case["kobc_snapshot"] = {"classes": {}}
        case["sources"]["profiles.Handysize.hire_usd_day"] = {"status": "market_benchmark", "observed_on": "2026-11-19"}
        imported = import_case(export_case(case))
        self.assertNotIn("kobc_snapshot", imported)
        self.assertEqual(imported["profiles"]["Handysize"]["hire_usd_day"], "16353")
        self.assertEqual(imported["sources"]["profiles.Handysize.hire_usd_day"]["status"], "historical_replay")
