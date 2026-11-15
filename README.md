# v-play

Aplikasi web belajar kosakata bahasa Inggris dasar untuk anak usia 1-5 tahun dengan ilustrasi bergaya buku cerita dan audio pelafalan lokal.

## Fitur

- **Sentuh & Dengar (1-2 tahun)**: kartu gambar besar yang langsung mengucapkan kata bahasa Inggris saat disentuh, plus opsi **Mode 1 kartu** agar anak fokus pada satu gambar besar.
- **Tebak Gambar (3-5 tahun)**: pertanyaan suara (*"Where is the elephant?"*) dengan pilihan **2 gambar** atau **3 gambar**, opsi sembunyikan/tampilkan tulisan kata, serta respons ramah saat salah sentuh.
- **Tanpa server & tanpa build**: seluruh aset gambar, audio MP3, dan font disimpan lokal memakai path relatif (`./`).

## Menjalankan Secara Lokal

Karena aplikasi memakai ES Modules (`<script type="module">`), jalankan lewat server statis lokal (bukan `file://`):

```bash
npx serve .
```

## Cara Unggah & Jalankan Langsung di GitHub Pages

1. Buat repository baru di GitHub (misalnya `v-play`) dan push seluruh isi folder ini ke branch `main`.
2. Buka **Settings > Pages** di repository tersebut.
3. Pada **Build and deployment**, pilih **Deploy from a branch**, pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
4. Tunggu beberapa saat sampai GitHub Pages menerbitkan URL aplikasi Anda (`https://<username>.github.io/v-play/`).

