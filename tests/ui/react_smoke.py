"""Exercise the compiled React app and FastAPI together in a local browser."""
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[2]


def main():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    # Smoke tests use the seeded market cache, independent of today's network availability.
    code = """
import sys
from unittest.mock import patch
import uvicorn
sys.path.insert(0, 'src')
from pilog_cfr_dss.api.main import app
with patch('pilog_cfr_dss.api.main.fetch_snapshot', side_effect=OSError), patch('pilog_cfr_dss.api.main.verify_benchmarks', side_effect=OSError):
    uvicorn.run(app, host='127.0.0.1', port=int(sys.argv[1]))
"""
    server = subprocess.Popen([sys.executable, "-B", "-c", code, str(port)], cwd=ROOT)
    try:
        base_url = f"http://127.0.0.1:{port}"
        for _ in range(50):
            try:
                with urlopen(base_url + "/api/v1/health", timeout=2):
                    break
            except OSError:
                if server.poll() is not None:
                    raise RuntimeError("FastAPI process exited.") from None
                time.sleep(.2)
        else:
            raise TimeoutError("FastAPI not ready.")
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel="msedge", headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 960})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(base_url)
            expect(page.get_by_role("button", name="Hitung freight", exact=True)).to_be_enabled(timeout=30000)
            expect(page.get_by_text("FIS · HS7TC", exact=False)).to_be_visible()
            page.get_by_role("button", name="Hitung freight", exact=True).click()
            expect(page.get_by_role("heading", name="Hasil freight", exact=True)).to_be_visible()
            expect(page.get_by_role("heading", name="Handysize", exact=True).first).to_be_visible()
            expect(page.get_by_role("heading", name="Supramax", exact=True).first).to_be_visible()
            page.get_by_label("Pelabuhan bongkar", exact=True).select_option(label="Hai Phong, Vietnam")
            expect(page.get_by_text("FIS · Handysize Pacific 3TC", exact=False)).to_be_visible()
            page.get_by_label("Basis waktu", exact=True).first.select_option("calendar")
            page.get_by_text("Jam kerja mingguan", exact=True).click()
            page.get_by_role("checkbox", name="Atur jam kerja per hari").check()
            expect(page.get_by_role("button", name="Tambah interval · Senin", exact=True)).to_be_visible()
            file = ROOT / "tests/fixtures/fd3_risk_pilog_open_hire.json"
            page.locator('input[type="file"]').set_input_files(str(file))
            expect(page.get_by_text("Analisis risiko dan mitigasi", exact=True)).to_be_visible()
            expect(page.get_by_role("checkbox", name="Analisis risiko dan mitigasi")).to_be_checked()
            page.get_by_role("button", name="Hitung freight", exact=True).click()
            expect(page.get_by_text("Kajian beli FFA.", exact=True)).to_be_visible(timeout=30000)
            expect(page.get_by_text("-2.747,19", exact=True)).to_be_visible()
            with page.expect_download() as dl:
                page.get_by_role("button", name="Download brief", exact=True).click()
            assert dl.value.path().read_text(encoding="utf-8").count("\n## ") == 5
            with page.expect_download() as bundle:
                page.get_by_role("button", name="Download kasus", exact=True).click()
            assert bundle.value.suggested_filename.endswith(".json")
            page.get_by_text("Spread Matrix", exact=True).click()
            expect(page.get_by_role("button", name="Download matrix")).to_be_visible()
            page.set_viewport_size({"width": 390, "height": 844})
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            assert not errors, errors
            browser.close()
        print("PASS: React + FastAPI, case import/export, FIS source, FFA brief, matrix, responsive viewport.")
    finally:
        server.terminate()
        server.wait(timeout=10)


if __name__ == "__main__":
    main()
