# FunPlay (v1.1)

Aplikasi web belajar kosakata bahasa Inggris dasar untuk anak usia 1-5 tahun dengan ilustrasi bergaya buku cerita dan audio pelafalan lokal. Lihat [CHANGELOG.md](CHANGELOG.md) untuk riwayat versi.

## Fitur

- **Sentuh & Dengar (1-2 tahun)**: kartu gambar besar yang langsung mengucapkan kata bahasa Inggris saat disentuh, plus opsi **Mode 1 kartu**.
- **Tebak Gambar (3-5 tahun)**, **Puzzle Kata**, **Cocokkan Kartu**, **Hitung Bersama**, dan **Cari yang Beda**.
- **Mode Preview Gratis & Akses Penuh**: gratis mencoba topik **Hewan & Warna** di Sentuh & Dengar, Tebak Gambar (2 gambar), Potongan Gambar Level 1, dan Kartu Memori Level 1; akses penuh sekali bayar membuka semua 6 permainan serta 201 kosakata (hingga 3 perangkat keluarga).

## Menjalankan Secara Lokal

```bash
npx serve .
```

Atau dengan test backend & logika aplikasi (Node.js 22+):

```bash
node --test tests/words.test.mjs tests/puzzle.test.mjs tests/games.test.mjs tests/license.test.mjs
```

## Deploy di Cloudflare Workers + D1

1. Hubungkan repository ini ke **Cloudflare Workers & Pages** (Workers with Static Assets) dengan nama Worker **`funplay`** sesuai [wrangler.toml](wrangler.toml).
2. Buat D1 Database bernama **`funplay-licenses`**, lalu jalankan isi [migrations/0001_licenses.sql](migrations/0001_licenses.sql) di Console D1.
3. Isi `database_id` pada blok `[[d1_databases]]` di [wrangler.toml](wrangler.toml) dan pasang environment variables/secrets (`LYNK_MERCHANT_KEY`, `LYNK_PRODUCT_URL`, dan opsional `RESEND_API_KEY`, `EMAIL_FROM`, `APP_PUBLIC_URL`, `MAX_DEVICES`).
