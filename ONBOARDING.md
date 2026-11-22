# Panduan Onboarding Affiliate & White-Label FunPlay

Dokumen ini berisi langkah operasional untuk mendaftarkan **Afiliator** maupun **Partner White-Label** di FunPlay.

---

## A. Onboarding Afiliator (Affiliate)

Cocok untuk partner promosi yang mengarahkan calon pembeli ke web FunPlay terlebih dahulu agar mencoba preview gratis sebelum checkout ke link affiliate Lynk.id mereka.

### Persiapan (Sekali di Awal)
1. Pastikan fitur **Private Affiliate** di dashboard Lynk.id sudah aktif dan persentase komisi sudah ditentukan.
2. Minta calon afiliator membuat akun Lynk.id (jika belum punya), lalu undang/tambahkan akun mereka di **Private Affiliate** produk FunPlay pada Lynk.id.
3. Dapatkan **Link Affiliate Lynk.id** khusus milik afiliator tersebut.

### Langkah Tambah Afiliator di FunPlay
1. Buka `https://funplay.web.id/admin.html` lalu login menggunakan `ADMIN_SECRET`.
2. Pastikan berada di tab **Affiliate**.
3. Isi form **Tambah Afiliator Baru**:
   - **Nama Afiliator**: contoh `Mama Ani`.
   - **Link Affiliate Lynk.id**: tempel link affiliate Lynk.id milik orang tersebut.
   - **Kode Ref (Opsional)**: kosongkan agar otomatis dibuatkan kode acak (misal `MAMA-7K2M`), atau isi kode custom.
4. Klik **Buat Link Ref**.
5. Klik **Salin Link** pada tabel, lalu kirim link tersebut (`https://funplay.web.id/?ref=KODE`) ke afiliator.

### Catatan Operasional Affiliate
- **Kunjungan** & **Klik Beli** bisa dipantau di tabel `/admin.html`.
- Penjualan sah & pencairan komisi tetap mengikuti sistem otomatis Lynk.id.
- Jika afiliator berhenti, cukup klik **Nonaktifkan** atau **Hapus** di tabel; pengunjung yang masih membawa `?ref=` lama otomatis kembali diarahkan ke link checkout utama FunPlay.

---

## B. Onboarding Partner White-Label (Multi-Tenant)

Cocok untuk partner yang menyewa platform FunPlay secara bulanan/tahunan dengan domain, nama brand, icon, warna, dan akun Lynk.id milik mereka sendiri.

### Langkah 1 — Siapkan Domain di Cloudflare
1. Pesan domain partner (misal `brandmereka.id`) dan arahkan DNS-nya ke akun Cloudflare kamu.
2. Di Cloudflare Dashboard → **Compute (Workers)** → **Workers & Pages** → pilih Worker **`funplay`** → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**.
3. Masukkan domain partner (`brandmereka.id`, dan `www.brandmereka.id` bila perlu). SSL/HTTPS akan aktif otomatis.

### Langkah 2 — Verifikasi Domain Email di Resend
1. Buka dashboard **Resend** → **Domains** → **Add Domain** (`brandmereka.id`).
2. Tambahkan DNS record (TXT/MX/DKIM) yang diminta Resend ke DNS domain tersebut di Cloudflare sampai statusnya **Verified**.
3. Dengan ini, email kode lisensi pembeli akan dikirim atas nama domain mereka sendiri (misal `BrandMereka <halo@brandmereka.id>`).

### Langkah 3 — Daftarkan Tenant di Admin FunPlay
1. Buka `https://funplay.web.id/admin.html` → pilih tab **White-Label (Tenant)**.
2. Isi form **Tambah Partner White-Label**:
   - **Domain Partner**: `brandmereka.id` (tanpa `https://`).
   - **Nama Brand**: contoh `BelajarKids`.
   - **Email Pengirim Resend**: contoh `BelajarKids <halo@brandmereka.id>`.
   - **Masa Aktif s.d.**: pilih tanggal berakhir langganan (misal 1 bulan atau 1 tahun ke depan).
3. Klik **Buat Tenant**.
4. Pada tabel **Daftar Partner White-Label**, klik **Salin URL Portal** (`https://brandmereka.id/brand-setup.html`) dan **Salin Token** (`fpb_...`), lalu kirimkan ke partner.

### Langkah 4 — Setup oleh Partner (Self-Service)
Partner membuka `https://brandmereka.id/brand-setup.html` dan login memakai **Token Portal** (`fpb_...`), lalu:
1. Mengisi **Nama Brand**, **Tagline**, dan upload **Logo/Icon** (otomatis menjadi icon header dan favicon).
2. Memilih **Preset Warna** atau **Custom Color Picker** sambil melihat **Live Preview**.
3. Mengisi **Link Produk Lynk.id** dan **Lynk.id Merchant Key** milik mereka.
4. Menyalin **URL Webhook** (`https://brandmereka.id/api/webhook/lynk`) dari halaman portal tersebut, lalu menempelkannya ke pengaturan **Webhook** di dashboard Lynk.id mereka.
5. Klik **Simpan Perubahan Brand**.

### Kontrol Masa Langganan
- Jika partner memperpanjang langganan: perbarui tanggal **Masa Aktif** atau klik **Aktifkan** di `/admin.html`.
- Jika masa aktif habis (`expires_at` terlewati) atau dinonaktifkan: domain partner otomatis berhenti melayani aplikasi & API dan menampilkan pemberitahuan masa aktif berakhir.
