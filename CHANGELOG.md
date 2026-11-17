# Riwayat Versi FunPlay

Dokumen ini mencatat perubahan pada aplikasi **FunPlay** (Main & Belajar Bahasa Inggris Anak 1-5 Tahun).

---

## v1.1 — 2026-11-17

**Ekspansi besar katalog kosakata (139 -> 201 kata) & 4 topik baru**

### Ditambahkan
- **4 topik kosakata baru** (menjadi 11 topik / 12 tombol filter berjajar rapi `4×3` di layar ponsel):
  - **Sayur (`vegetables`)** — 20 kata (`Beans`, `Bell pepper`, `Broccoli`, `Cabbage`, `Carrot`, `Cauliflower`, `Chili`, `Corn`, `Cucumber`, `Eggplant`, `Garlic`, `Lettuce`, `Mushroom`, `Onion`, `Peas`, `Potato`, `Pumpkin`, `Radish`, `Spinach`, `Tomato`)
  - **Makanan (`food`)** — 15 kata (`Bread`, `Cake`, `Cheese`, `Cookie`, `Donut`, `Egg`, `Honey`, `Ice cream`, `Milk`, `Noodles`, `Pizza`, `Rice`, `Sandwich`, `Soup`, `Water`)
  - **Tubuh (`body`)** — 12 kata (`Arm`, `Ear`, `Eye`, `Face`, `Foot`, `Hair`, `Hand`, `Knee`, `Mouth`, `Nose`, `Teeth`, `Tongue`)
  - **Kendaraan (`vehicles`)** — 15 kata (11 kata baru: `Ambulance`, `Boat`, `Fire truck`, `Helicopter`, `Motorcycle`, `Rocket`, `Scooter`, `Ship`, `Tractor`, `Train`, `Truck`, ditambah 4 kata pindahan dari `Benda`)
- **4 kata pengganti pada topik Benda (`objects`):** `Bed`, `Door`, `Lamp`, dan `Pillow` (total `Benda` tetap 20 kata).
- **Integrasi permainan & puzzle:**
  - `vegetables`, `food`, dan `vehicles` didaftarkan ke `COUNTABLE_CATEGORIES` untuk mode **Hitung Gambar**; seluruh topik baru ikut aktif di **Sentuh & Dengar**, **Tebak Gambar**, **Puzzle** (*Potongan Gambar*, *Cocokkan Bayangan*, *Susun Huruf*), **Kartu Memori**, dan **Cari yang Berbeda**.
  - Kategori `vehicles` disertakan dalam `punchWhiteHoles` pada mode **Cocokkan Bayangan** agar siluet kendaraan berongga (seperti `Bicycle`) tetap jelas.
  - Penyesuaian prompt kalimat tanya bahasa Inggris jamak (`"Where are the ...?"`) untuk `beans`, `peas`, `noodles`, dan `teeth`.

### Diubah
- Memindahkan `Airplane`, `Bicycle`, `Bus`, dan `Car` dari kategori `objects` ke kategori `vehicles`.
- Memperbarui tampilan jumlah total katalog dari `139` menjadi `201 kosakata` pada modal aktivasi lisensi, UI aplikasi, README, dan unit test.
- Memperbarui versi footer aplikasi dari `v1.0` menjadi `v1.1`.
- Menambahkan preload khusus untuk 2–4 gambar ronde aktif di **Kartu Memori** agar gambar langsung tampil instan saat kartu disentuh.

### Diperbaiki
- Memperbaiki bug layout Safari iOS (WebKit) pada tombol kartu flex-column (`.card-art`, `.spotlight-img-box`, `.letters-picture-card`, `.shadow-target-box`) yang membuat kartu melar ke bawah, keluar batas stage, dan menutupi kotak feedback/`Lanjut` serta footer.

### Aset Audio & Gambar
- Mengonversi seluruh 201 gambar dari `.jpg` ke `.webp` pada resolusi penuh `1024×1024 px` (total ukuran aset gambar turun dari `70,39 MB` menjadi `6,17 MB`), disertai normalisasi path cache `.jpg` → `.webp` pada `unlockCatalogWords`.
- Melengkapi seluruh 201 kosakata dengan klip audio `.mp3` lokal (`assets/audio/words/`, `prompts/`, `praise/`), termasuk 186 file `.mp3` baru untuk 62 kata tambahan yang dibuat dengan `edge-tts` (`en-US-AvaNeural`, `rate="-10%"`).

---

## v1.0 — 2026-11-16

**Rilis perdana FunPlay**

- **6 mode permainan anak usia 1–5 tahun:** *Sentuh & Dengar* (termasuk *Mode 1 kartu*), *Tebak Gambar*, *Puzzle* (*Potongan Gambar*, *Cocokkan Bayangan*, *Susun Huruf* 3 level usia), *Kartu Memori*, *Hitung Gambar*, dan *Cari yang Berbeda*.
- **Katalog awal 139 kosakata dalam 7 topik:** `Hewan` (20 kata gratis), `Warna` (12), `Buah` (20), `Benda` (20), `Huruf` (26), `Angka` (29), dan `Bentuk` (12) lengkap dengan panduan pelafalan dan klip audio MP3 lokal.
- **Antarmuka ramah balita & ponsel:** tema pastel Sago Mini, ikon visual tiap menu & kategori, grid kategori `4×2` pada ponsel, serta mode fokus kompak.
- **Sistem akses penuh & lisensi:** integrasi Cloudflare Workers + D1 database untuk aktivasi lisensi hingga 3 perangkat, webhook Lynk.id, dan pemulihan kode lisensi via email.

