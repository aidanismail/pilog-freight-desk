# PILOG Freight Desk

Kalkulator freight dry bulk dan commercial brief untuk membandingkan Handysize dan Supramax. React menampilkan formulir serta hasil. FastAPI menjalankan perhitungan Python, pemilihan benchmark, uji risiko, Spread Matrix, dan ekspor.

## Jalankan di Windows

Dari root repo, siapkan Python 3.12, Node 22, dan environment lokal.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
.\.venv\Scripts\python.exe -m uvicorn pilog_cfr_dss.api.main:app --app-dir src --host 127.0.0.1 --port 8000
```

Buka `http://127.0.0.1:8000`. Satu proses FastAPI menyajikan aset React dan API. Untuk mengedit tampilan, jalankan `npm.cmd --prefix frontend run dev` di terminal terpisah sementara FastAPI memakai port 8000. Vite meneruskan permintaan API ke FastAPI.

## Data demo FIS

PDF FIS disediakan sebagai file internal terpisah. Setup lokal saat ini sudah memiliki file dan snapshot. Pada checkout baru, taruh file sumber di `data/sources/market/fis/` dan impor dengan perintah berikut.

```powershell
.\.venv\Scripts\python.exe scripts/import_fis_report.py data/sources/market/fis/fis-freight-index-report_2026-10-30.pdf
```

Kasus baru memakai assessment FIS terakhir yang valid. Kedua port dalam kelompok Pacific yang didokumentasikan memakai basket Pacific demo sesuai kelas. Rute yang belum terpetakan memakai HS7TC atau S11TC. Jika snapshot belum disiapkan, pengguna bisa mengisi quotation manual. Angka FIS historis, *as-of* sumber ditampilkan, dan manual override dipertahankan ketika rute berubah. Bunker Fearnpulse tetap diperbarui saat membuat kasus baru dan memiliki snapshot fallback.

- `data/sources/` berisi PDF dan workbook asal.
- `data/catalogs/` berisi port, profil kapal, dan default voyage. Regenerasi dari workbook lewat `scripts/sync_voyage_inputs.py`.
- `data/market_snapshots/` berisi benchmark bertanggal per penyedia.
- `runtime/` berisi cache dan hasil sementara yang dapat dibuat ulang.
- `tests/fixtures/` berisi contoh paket impor, termasuk risiko hire PILOG dan freight PI.

## Alur demo

Buka paket `tests/fixtures/fd3_risk_pilog_open_hire.json`, klik **Hitung freight**, lalu buka **Commercial Brief**. Bagian 2 menjelaskan penanggung risiko, bagian 3 menunjukkan opsi kajian FFA dan rujukan klausul, bagian 5 memperlihatkan dampak skenario biaya. Rujukan klausul dicatat per perjanjian. Penghitungan settlement FFA dan transaksi berada di luar fitur demo.

## Pengujian

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-ui-test.txt
$env:PYTHONPATH = 'src'
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -t .
.\.venv\Scripts\python.exe -B tests/ui/react_smoke.py
```

Browser smoke memerlukan Edge dan build React. Baseline Streamlit dan histori iterasi tersedia pada branch `feature/freight-risk-mitigation` di commit `c7a99ca`. Detail pembaruan ada di [rencana migrasi](docs/RENCANA_MIGRASI_FREIGHT_DESK.md).
