# PILOG Freight Desk

Kalkulator freight dry bulk untuk Handysize dan Supramax, dengan Spread Matrix, analisis risiko, dan Commercial Brief. Dibangun dengan React dan FastAPI.

## Jalankan di Windows

Dari root repo, gunakan Python 3.12 dan Node.js 22.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd --prefix frontend ci
.\.venv\Scripts\python.exe scripts/dev.py
```

Buka [http://127.0.0.1:5173](http://127.0.0.1:5173). Perubahan frontend dan backend terdeteksi saat file disimpan. Tekan `Ctrl+C` untuk berhenti.

## Preview build

```powershell
npm.cmd --prefix frontend run build
.\.venv\Scripts\python.exe -m uvicorn pilog_cfr_dss.api.main:app --app-dir src --host 127.0.0.1 --port 8000
```

Buka [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Coba kasus

Buka paket contoh `tests/fixtures/fd3_risk_pilog_open_hire.json`, lalu klik **Hitung freight**. Petunjuk sumber data tersedia di [dokumentasi proyek](docs/RENCANA_MIGRASI_FREIGHT_DESK.md).

Setiap perhitungan yang selesai masuk ke **Riwayat kasus** di browser. Buka hasil lama dari riwayat atau download paket JSON untuk dipindah ke browser lain.

## Pengujian

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-ui-test.txt
$env:PYTHONPATH = 'src'
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -t .
.\.venv\Scripts\python.exe -B tests/ui/react_smoke.py
```

Tes browser memakai Microsoft Edge dan build React dari bagian **Preview build**.
