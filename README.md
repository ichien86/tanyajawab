# Forum Interaktif Tanya Jawab & Kuesioner Dinamis (Mobile-First)

Aplikasi forum tanya jawab interaktif berbasis web **Mobile-First** yang dirancang khusus untuk kegiatan sosialisasi, seminar, atau forum koordinasi lapangan. Dibangun berdasarkan **Technical Design Document (TDD v2.0)** pada [https://share.gemini.google/6EITILpGyruU](https://share.gemini.google/6EITILpGyruU).

Aplikasi berfokus penuh pada **Tanya Jawab**, di mana setiap penanya dapat mengatur jenis jawaban yang diinginkan (teks bebas atau kuesioner terstruktur dengan pertanyaan lanjutan kondisional), peserta lain dapat saling menjawab secara dinamis, dan admin dapat memoderasi serta mengekspor hasil ke **Excel (.xlsx)** serta **CSV**.

---

## 🌟 Fitur Utama

### 1. Penanya Dapat Mengatur Format Jawaban & Pertanyaan Kondisional
Saat menekan tombol **"Tanya Sesuatu"**, penanya dapat memilih:
- **Teks Bebas Biasa**: Penjawab merespons dengan teks naratif biasa.
- **Format Kuesioner (Pilihan Jawaban Khusus)**:
  - Penanya dapat menentukan jenis input yang diharapkan dari responden:
    1. `short_text`: Teks singkat (nama, instansi, nomor kontak).
    2. `long_text`: Uraian naratif kendala atau solusi.
    3. `radio`: Pilihan tunggal.
    4. `checkbox`: Pilihan ceklis majemuk (bisa pilih lebih dari satu).
    5. `file`: Unggah dokumen bukti (PDF/JPG/PNG max 2MB).
  - **Pertanyaan Lanjutan Kondisional (Parent-Child Logic)**:
    - Penanya dapat menambahkan sub-pertanyaan yang otomatis muncul jika penjawab memilih opsi tertentu pada pertanyaan sebelumnya (contoh: jika pertanyaan #1 menjawab "Ya", maka munculkan pertanyaan #2 "Pilih jenis logistik yang dibutuhkan", dst).

### 2. Antarmuka Peserta (Mobile-First Layout)
- **Live Q&A Feed**:
  - Filter: **Terpopuler (Upvotes)**, **Terbaru**, dan **Belum Terjawab**.
  - Kolom pencarian instan pertanyaan dan topik.
  - Sistem **Upvote** 1 suara per perangkat menggunakan *fingerprint UUID* di penyimpanan lokal.
  - Opsi **Kirim sebagai Anonim** (`is_anon: true/false`).
  - **Threaded Answers**: Siapapun boleh menanggapi atau menjawab pertanyaan peserta lain.
  - **Realtime Push Updates**: Terhubung ke Server-Sent Events (SSE) `/api/events` sehingga pertanyaan, jawaban, dan upvote langsung muncul di layar peserta tanpa reload.
  - **Kompresi Gambar di Perangkat Klien**: Foto kamera resolusi tinggi otomatis dikompresi menjadi $\le 500\text{ KB}$ sebelum diunggah ke server.

### 3. Panel Admin Tersembunyi (`/admin`)
- **Hidden Route**: Hanya dapat dibuka melalui URL langsung `http://localhost:5001/admin`. Tidak ada tombol login di header/footer publik.
- **Proteksi Brute-Force**: Maksimal 5 kali percobaan gagal per IP per 15 menit dengan *exponential backoff lockout* (30 detik $\to$ 5 menit $\to$ 15 menit), password di-hash dengan bcrypt, dan sesi JWT aman.
- **Moderasi Tanya Jawab (CRUD)**: Ubah status pertanyaan (`open`, `answered`, `hidden`), kirim jawaban resmi dengan badge **Fasilitator**, dan hapus konten yang tidak pantas.
- **Ekspor Laporan Terpadu**: Ekspor seluruh pertanyaan, upvotes, dan rincian jawaban (baik teks bebas maupun kuesioner berstruktur) ke **Excel (.xlsx)** dan **CSV**.

### 4. Keamanan Berkas (Server-Side)
- Batas ukuran upload Multer $\le 2\text{ MB}$.
- **Verifikasi Magic-Bytes Asli**: PDF (`25 50 44 46`), PNG (`89 50 4E 47`), dan JPEG (`FF D8 FF`) untuk menolak berkas palsu.
- Berkas diisolasi di luar root folder publik (`backend/uploads/`) dengan penamaan acak `{session_id}_{uuidv4}.{ext}`.

### 5. Arsitektur Dual-Driver Database
- **Zero-Config Ready**: Otomatis menggunakan *embedded database* lokal (`backend/data/db_store.json`) sehingga aplikasi dapat langsung dijalankan tanpa menginstal daemon MongoDB.
- **MongoDB Ready**: Langsung otomatis beralih ke MongoDB native atau MongoDB Atlas bila `MONGO_URI` dikonfigurasi di file `.env`.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Jalankan Aplikasi
Build frontend dan jalankan server terpadu dalam satu perintah:

```bash
npm run start:full
```

Buka peramban di:
- **Layar Peserta**: [http://localhost:5001](http://localhost:5001)
- **Portal Admin**: [http://localhost:5001/admin](http://localhost:5001/admin)

*Kredensial Default Admin:*
- **Username**: `admin_utama`
- **Kata Sandi**: `admin123`

### 2. Menjalankan Pengujian Otomatis (Tests)

```bash
npm test
```

*Hasil Pengujian:* **11/11 Unit Tests PASS** & **10/10 In-Process Flow Tests PASS**.
