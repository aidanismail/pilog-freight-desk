# Rencana migrasi PILOG Freight Desk

24 November 2026 · Aidan menyetujui implementasi lokal. Baseline fitur berasal dari `feature/freight-risk-mitigation` pada `c7a99ca`. Branch implementasi `feature/react-fastapi-migration`. Aidan menangani deployment.

**Konfirmasi Aidan.** PDF FIS edisi 30 Oktober 2026 disetujui sebagai sumber benchmark historis untuk demo internal, termasuk pemakaiannya di preview yang dibagikan kepada mentor. Pembahasan langganan, API, dan cakupan pemakaian operasional dilakukan terpisah oleh PI/PILOG. Pertanyaan mentor tentang klausul merujuk pada perjanjian bisnis tempat klausul ditaruh.

## Yang sudah diperiksa

- Remote baru `https://github.com/aidanismail/pilog-freight-desk` terverifikasi lewat `git ls-remote`. Default branch `main`, `dev` di `0fb5f7f`, dan branch risiko di `c7a99ca`. Folder lokal sudah bernama `pilog-freight-desk`; `origin` lokal masih menunjuk URL lama `pilog-cfr-dss`. Pembaruan remote masuk batch implementasi.
- PDF lokal `data/Freight-Index-Report-2026-10-30-1.pdf` berisi satu halaman bertanggal 30 Oktober 2026. Kolom **Today** memuat **HS7TC 18.255 USD/hari**, **S11TC 23.569 USD/hari**, **Handysize Pacific 3TC 18.179 USD/hari**, dan **Supramax Pacific 3TC 23.450 USD/hari**. PDF juga memuat assessment rute individual. Kolom MTD/YTD dan indeks dalam poin punya makna berbeda dari hire harian. Pencarian publik 24 November belum menemukan edisi November dari seri yang sama yang bisa diverifikasi. [Laporan FIS 30 Oktober](https://fisapp.com/wp-content/uploads/2026/10/Freight-Index-Report-2026-10-30-1.pdf) · [Definisi rute dan seri Baltic](https://www.balticexchange.com/en/data-services/market-information0/dry-services.html)
- Pemakaian KOBC tersebar di `sources/kobc.py`, aplikasi, Streamlit, CLI, Commercial Brief, metadata paket kasus, contoh kasus, dan tes. Penggantian mencakup semua jalur tersebut. Sebagian snapshot Fearnpulse menggunakan nama `fp_<hash>` di `data/processed` dan `outputs/market_cache`. PDF Argus/Fertecon masih dibaca dari `public/`. Ketiganya termasuk inventaris untuk penataan ulang.

## Batch 1 — Ganti KOBC dengan benchmark FIS

1. Kunci satu baseline pengujian sebelum perubahan. Buat branch migrasi dari branch risiko agar fitur yang sudah direview terbawa. Ganti URL `origin` dan verifikasi branch. Simpan informasi commit pembanding di README untuk rollback dan audit.
2. Tambahkan ingest FIS yang membaca PDF lokal yang sudah disetujui dan menyimpan data terstruktur. Ambil kolom **Today** untuk seri Handysize dan Supramax berunit USD/hari. Simpan penerbit, nama laporan, halaman, kode/label seri, kelas, unit, tanggal assessment, waktu ingest, basis benchmark bila terverifikasi, dan hash file. Bedakan tanggal publikasi dari waktu sistem memproses laporan. Penimpaan snapshot berlaku setelah struktur, tanggal, seri wajib, dan nilai tervalidasi. Gunakan angka uji sintetis untuk regression fixtures yang masuk Git.
3. Kebijakan pemilihan yang diusulkan: **assessment rute/koridor dengan kecocokan terdokumentasi → basket regional yang relevan → TC average kelas → input hire manual**. Kecocokan mempertimbangkan arah, delivery/redelivery, tipe perjalanan dan kelas. Bila bukti regional belum cukup, langsung pilih rata-rata kelas (`HS7TC` atau `S11TC`). Gunakan label basket yang tertulis dari FIS. Anggap ekuivalensi dengan kode basket resmi Baltic baru valid setelah metodologinya cocok. Simpan alasan pemilihan; jangan mewariskan pemetaan MH/MS milik KOBC. Quotation manual diprioritaskan, termasuk ketika laporan baru masuk. Tampilkan tanggal, kode, tingkat kecocokan, dan status benchmark pada hasil.
4. **Perilaku demo yang disetujui:** gunakan snapshot FIS 30 Oktober untuk nilai awal hire yang bisa diedit dan tampilkan **Historis · 30 Okt 2026**. Quotation manual diprioritaskan dan kasus tersimpan tetap bisa direplay. Refresh halaman memuat snapshot terbaru yang tersedia di backend, beserta tanggal assessment aslinya. Untuk pemakaian operasional, PI/PILOG dapat menilai umur data dan jalur langganan melalui [FIS Data Services](https://freightinvestorservices.com/services/).
5. Pensiunkan parser, cache, sinkronisasi, fallback, field provider aktif, label, fixture baru, dan test khusus KOBC. Untuk paket lama, gunakan satu migrasi versi: verifikasi hash dulu, pertahankan nilai hire yang dibekukan sebagai input replay historis, dan tampilkan provenance asal secara generik. Kalkulasi berjalan dari angka paket tanpa meminta layanan lama. Buat export baru dengan kontrak data sumber generik. Fixture untuk demo berlabel FIS atau sintetis sesuai sumbernya. Riwayat commit tetap bisa ditelusuri tanpa *rewrite history*.
6. Preview internal boleh menampilkan angka snapshot dari file yang telah disetujui Aidan. Simpan PDF sumber di penyimpanan backend internal, terpisah dari aset web. Pengembangan parser menggunakan PDF lokal serta fixture sintetis untuk pengujian berulang.

## Batch 2 — Tempatkan informasi klausul hedging

Ada dua keputusan yang berbeda. **Klausul penyesuaian harga** menentukan siapa yang menanggung perubahan biaya. **Keputusan hedging internal** menentukan apakah exposure yang tersisa akan dikaji dengan instrumen seperti FFA. Untuk versi ini, rekomendasinya mencatat keduanya dengan jelas dalam brief dan membantu review kontrak, tanpa merumuskan naskah siap tanda tangan. [Contoh struktur penyesuaian harga bunker BIMCO](https://www.bimco.org/contractual-affairs/bimco-clauses/current-clauses/bunker_price_adjustment_clause_2004/) · [Baltic Exchange tentang FFA](https://www.balticexchange.com/en/news-and-events/news/member-news/2026/Understanding-FFAs-What-are-FFAs-and-why-they-matter.html)

| Lokasi | Isi yang dicatat | Waktu menggunakan |
|---|---|---|
| Status transaksi → perjanjian yang relevan | Tipe klausul, rujukan dokumen/pasal, status, biaya yang dicakup, periode, dan pihak pembayar. Jika ada, catat benchmark pemicu, formula dan batas sesuai dokumen. | Saat memasukkan status harga PI–buyer, freight PI–PILOG, atau charter PILOG–shipowner. Tiap kontrak dievaluasi sendiri. |
| Commercial Brief → Risiko dan tindakan | Satu baris **Klausul / tindak lanjut** tepat di bawah opsi mitigasi terkait. Tampilkan kontrak yang perlu dicek, pihak yang perlu menindaklanjuti, dan status seperti **Belum diketahui**, **Perlu review**, atau **Tercatat**. | Saat review brief sebelum mengikat penawaran atau sebelum fixture. Bagian Exposure merujuk status klausul bila alokasi biaya bergantung padanya. |
| Treasury / kajian FFA | Indeks, periode, kesesuaian dengan exposure, pihak berwenang dan prasyarat keputusan. | Setelah exposure yang hendak dilindungi teridentifikasi. Statusnya **Kajian** pada fitur sekarang. |

**Usulan lokasi kontrak untuk kasus PI–PILOG.** Letakkan klausul **Penyesuaian Tarif Freight** di bagian tarif dan pembayaran dalam **perjanjian jasa angkutan PI–PILOG**. Jika hubungan diatur lewat kontrak payung, usulkan prinsip dan formula di kontrak payung atau adendumnya. Booking/konfirmasi voyage merujuk nomor pasal dan mengisi parameter khusus voyage yang memang diizinkan oleh kontrak payung. Jika hanya satu shipment dan menggunakan kontrak jasa tersendiri, klausul masuk dalam kontrak shipment itu.

Yang perlu disepakati Commercial PI/PILOG dan Legal mencakup biaya yang dapat disesuaikan, benchmark dan tanggal basis, periode penilaian, formula serta unit, ambang pemicu, batas penyesuaian, bukti tagihan, dan perlakuan ketika biaya naik atau turun. Contohnya, pada Kerteh–Hai Phong, usulan klausul ini relevan bila PI dan PILOG memang ingin berbagi risiko kenaikan hire antara tarif freight disepakati dan fixture kapal. Ketika freight sudah mengikat, gunakan klausul yang berlaku dan cakupan yang disepakati. Brief memberi status **Perlu review** jika dasar penyesuaian belum lengkap, dan menampilkan skenario sebagai sensitivitas sampai alokasinya terkonfirmasi.

Jika PI ingin meneruskan sebagian kenaikan ke buyer, perlu dasar tersendiri dalam **kontrak jual beli PI–buyer**. Jika yang ingin dikunci adalah hire atau biaya yang dibayar kepada shipowner, tempatnya di **charter party PILOG–shipowner** sesuai kesepakatan kedua pihak. Jika PILOG memutuskan mengambil FFA untuk exposure yang masih terbuka, Treasury dan pihak berwenang menanganinya melalui dokumentasi transaksi derivatif yang terpisah. Setiap kontrak diperiksa menurut arus biaya yang diaturnya.

## Batch 3 — Pisahkan React dan FastAPI

- **React + TypeScript + Vite** mengelola formulir, tabel, rute navigasi ringan, perbandingan skenario, dan state input pengguna. **FastAPI + Pydantic di Python** menangani validasi, kalkulasi `Decimal`, port lookup, ingestion, risiko, dan ekspor brief. Pakai kembali modul Python `calculations`, `decisions`, `application`, dan `reporting`. React menampilkan hasil API. Skema OpenAPI menjadi kontrak data; nilai desimal pada batas API memakai string, dan tampilan mengikuti format dua desimal. [FastAPI](https://fastapi.tiangolo.com/) · [Vite build/deploy](https://vite.dev/guide/static-deploy.html)
- Buat kontrak API minimal di `/api/v1` untuk katalog/default kasus, resolusi rute, evaluasi voyage dan risiko, Spread Matrix, serta import/export paket. Pesan validasi menyebut field terkait. Preview awal menggunakan paket JSON untuk menyimpan kasus dan menyimpan snapshot sumber di server. Akses via perusahaan atau host privat diputuskan sebelum preview memuat data riil.
- Build React dan layani bersama FastAPI di satu origin pada preview agar pengoperasian sederhana. API tetap terpisah secara modul. Jalankan frontend dan backend sebagai proses terpisah saat development. Satu layanan deployment cukup untuk demo; opsi host dibahas setelah hasil teknis lokal siap. [FastAPI static files](https://fastapi.tiangolo.com/tutorial/static-files/)

### Struktur modul yang diusulkan

```text
pilog-freight-desk/
├── frontend/src/
│   ├── app/                       # Halaman utama dan state kasus
│   ├── api/                       # Klien HTTP dan tipe respons
│   └── features/
│       ├── voyage/                # Form rute, kapal, muatan, biaya dan hasil voyage
│       ├── market/                # Benchmark hire, tanggal sumber dan quotation
│       ├── risk/                  # Status transaksi, skenario dan opsi mitigasi
│       ├── commercial-brief/      # Ringkasan hasil dan unduhan brief
│       └── spread-matrix/         # Perbandingan rute
├── src/pilog_cfr_dss/
│   ├── api/                       # FastAPI, kontrak request/response dan endpoint
│   ├── application/               # Orkestrasi evaluasi, snapshot dan paket kasus
│   ├── calculations/             # Durasi, biaya, kapasitas dan sensitivitas
│   ├── decisions/                # Aturan rekomendasi, exposure dan mitigasi
│   ├── sources/                  # Importer per sumber, termasuk fis.py
│   ├── models/                   # Struktur kasus dan input domain
│   ├── validation/               # Validasi angka, unit dan input kasus
│   └── reporting/                # Commercial Brief dan format ekspor
├── data/
│   ├── sources/                  # PDF, Excel dan sumber asli
│   ├── catalogs/                 # Pelabuhan, profil kapal dan default voyage
│   └── market_snapshots/         # Benchmark pasar bertanggal per provider
├── tests/                        # Tes Python dan fixture
└── docs/                         # Panduan operasi, arsitektur dan metodologi
```

- **Tambah sumber FIS.** Parser FIS ada di `sources/fis.py`. Backend membaca snapshot FIS dengan skema sumber yang sama seperti data hire lain. Aturan pemilihan rute/basket ada di `application/`, sementara frontend `market/` menampilkan nilai dan asal yang dikirim API.
- **Ubah rumus atau aturan.** Rumus voyage dan stress ada di `calculations/`. Aturan kapan exposure terbuka atau kapan opsi FFA muncul ada di `decisions/`. Alur ini dipakai untuk hasil layar, brief, dan ekspor.
- **Ubah tampilan.** Edit folder React sesuai fitur. Komponen yang benar-benar digunakan lintas fitur baru dipindahkan ke komponen bersama. Mulai dengan paket Python yang sudah ada, satu backend dan satu frontend. Pemecahan modul lebih lanjut mengikuti tanggung jawab yang sudah terlihat di kode.

## Batch 4 — Desain UI dan hasil yang bisa dibaca cepat

- **Voyage** menampilkan pelabuhan, muatan, kelas kapal, hire/day dan sumber di bagian atas. Pisahkan Port DA muat dan bongkar. Rincian bahan bakar, kalender, dan biaya tambahan dibuka bila diperlukan. Jarak dan benchmark diperbarui saat rute berubah, dengan indikator ketika hasil sebelumnya perlu dihitung ulang. Quotation manual tetap menjadi input yang jelas terlihat.
- **Hasil** menampilkan freight impas, estimasi hari, biaya, serta surplus/defisit bila tarif jual ada. Rincian biaya dan Spread Matrix tetap tersedia. Bandingkan angka antar kelas pada basis skenario yang sama.
- **Commercial Brief** menampilkan satu ringkasan untuk jalur yang perlu ditindaklanjuti: **risiko, penanggung, surplus awal → surplus setelah perubahan, aksi utama**. Di bawahnya tampilkan opsi mitigasi, rujukan klausul dan asumsi harga. FFA diberi label **Kajian beli/jual FFA**; skenario hire menunjukkan dampak sebelum mitigasi. Status transaksi dan input risiko tambahan dibuka ketika relevan. Gunakan bahasa Indonesia singkat dan identitas visual PILOG yang sudah ada.

## Batch 5 — Bersihkan repo dan verifikasi cutover

| Lokasi target | Isi |
|---|---|
| `frontend/` | React, aset UI yang dipakai dan lockfile. Logo berada di sini. |
| `src/pilog_cfr_dss/` | API, application, kalkulasi, aturan, sumber, validasi dan rendering brief. Pertahankan nama paket Python pada fase porting agar diff fokus. |
| `data/sources/` | File sumber yang dibaca saat impor atau regenerasi. Contoh `market/fis/fis-freight-index-report_2026-10-30.pdf`, `operations/voyage-estimate.xlsx`, dan `operations/ports.xlsx`. PDF pasar disimpan di lokasi backend internal. |
| `data/catalogs/` | Data referensi yang dipakai aplikasi untuk pilihan port, profil kapal, dan nilai awal operasi. Contoh `ports.json`, `vessel-profiles.json`, dan `voyage-defaults.json`. Katalog diperbarui ketika data referensinya berubah. |
| `data/market_snapshots/` | Benchmark bertanggal yang sudah diimpor dan diperiksa. Contoh `fis/tc-rates_2026-10-30.json` dan `fearnpulse/bunker-prices_<tanggal>.json`. Metadata menghubungkan snapshot dengan file sumber dan waktu pengambilan/ingest. |
| `runtime/` | Cache unduhan, log dan hasil uji lokal yang bisa dibuat ulang. Abaikan dari Git. |
| `tests/fixtures/` | Kasus dan snapshot sintetis untuk regresi. |
| `docs/` | Ringkas menjadi panduan operasi, arsitektur/data, metodologi dan satu catatan perubahan aktif. |

**Contoh alur FIS.** Taruh laporan PDF di `data/sources/market/fis/`, jalankan impor untuk membuat `data/market_snapshots/fis/tc-rates_2026-10-30.json`, lalu FastAPI membaca snapshot tersebut saat mengisi benchmark hire. Jika laporan baru masuk, proses impor membuat snapshot bertanggal baru. Di jalur yang lain, `ports.xlsx` membentuk `data/catalogs/ports.json`, yang dipakai FastAPI untuk pilihan pelabuhan. Saat navigasi repo, `sources` menjawab asal data, `catalogs` menjawab pilihan dan nilai awal, dan `market_snapshots` menjawab harga serta tanggalnya.

Inventaris dulu referensi loader, tooling, `.gitignore`, tes, dan dokumen sebelum menghapus. Kandidat cleanup: artefak iterasi duplikat, template agen yang sudah usang, screenshot lepas, output lama, dan snapshot Fearnpulse ganda. Pertahankan satu aturan agent yang pendek dan dokumen yang dibutuhkan tim. Jika Streamlit, skrip, atau test lama sudah punya pengganti dan lolos verifikasi, hapus dari branch migrasi. Data pekerjaan dan referensi audit yang masih diperlukan dipindah atau ditunjuk secara eksplisit. Pisahkan commit pergantian provider, porting, dan cleanup agar gampang diperiksa atau dibalik.

**Kriteria selesai.** Fixture input sama menghasilkan biaya, hari, TCE, surplus, dan rekomendasi yang sama melalui API. Perubahan nilai benchmark diuji terpisah dari porting UI. Tes mencakup kode/kolom FIS, snapshot historis dan data invalid, fallback rute/kelas, quotation manual, kasus tanpa tarif jual, replay kasus lama, fixture risiko PI/PILOG, klausul belum diketahui, dan Spread Matrix. Jalankan browser E2E untuk impor kasus, hitung freight, demo FFA, dua kelas, ekspor dan tampilan mobile. Audit bersih dari integrasi dan fetch KOBC aktif serta dari dokumen market di aset publik. Preview baru diuji dan disetujui sebelum cutover.

## Yang perlu dikonfirmasi untuk review

- **Dokumen bisnis.** Jika ada template perjanjian freight atau kontrak payung PI–PILOG, versi yang sudah disamarkan akan membantu menentukan judul bagian dan nomor pasal. Rencana dapat direview dan aplikasi dapat dikembangkan dengan rujukan sintetis; naskah final dibahas dengan Commercial dan Legal.
- **Preview.** Host FastAPI bisa dipilih setelah review lokal. Keputusan host dibutuhkan saat ingin berbagi link React + FastAPI.

## Catatan implementasi lokal

- `origin` memakai nama GitHub baru. Branch pembanding Streamlit berisi baseline dan riwayat lama. Branch migrasi memakai React dan FastAPI dengan satu URL lokal. Lihat perintah penggunaan di README.
- Demo membaca laporan FIS 30 Oktober yang diimpor lokal. PDF dan snapshot FIS berada di penyimpanan proyek yang diabaikan Git. Untuk checkout baru, siapkan kembali PDF dan jalankan importer. Pemilihan yang aktif menggunakan basket Pacific untuk kelompok port demo, lalu `HS7TC` atau `S11TC` jika relevansi basket belum didukung. Assessment rute dicatat pada snapshot; pemetaan route-specific menunggu definisi dan kecocokan kontrak yang terdokumentasi.
- KOBC dihapus dari sumber aktif, CLI, UI dan brief. Kompatibilitas satu arah membaca metadata paket lama untuk mempertahankan nilai hire dari paket historis. Kalender, uji sensitivitas dan Spread Matrix tetap menggunakan mesin Python. Rujukan klausul disimpan per kontrak, tampil di brief, dan tidak menetapkan pergeseran exposure secara otomatis.
- Verifikasi lokal: 92 tes Python lulus. Build TypeScript/Vite dan smoke test React + FastAPI di browser lulus untuk perubahan rute dan benchmark Pacific, kalender kerja, hitung dua kelas, impor/ekspor paket, opsi kajian FFA, unduhan brief dan Spread Matrix. Uji browser memakai fallback sumber pasar yang tersimpan. CLI secara terpisah berhasil me-replay paket risiko. Bukti eksternal deployment belum tersedia karena perjalanan ini sampai uji lokal.
