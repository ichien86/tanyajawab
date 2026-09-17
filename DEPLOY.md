# Panduan Lengkap: Menghubungkan ke MongoDB & Deployment Aplikasi

Panduan langkah demi langkah untuk mengaktifkan database **MongoDB Native** dan melakukan **Deployment ke Cloud / Server VPS** agar aplikasi dapat diakses online oleh seluruh peserta kegiatan.

---

## 🍃 Bagian 1: Menyiapkan Database MongoDB Atlas (Gratis Selamanya)

MongoDB Atlas adalah layanan database cloud resmi dari MongoDB. Menyediakan cluster **M0 Free Tier** dengan kapasitas 512 MB gratis tanpa perlu kartu kredit.

### Langkah 1: Buat Akun & Cluster Gratis
1. Buka [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) dan daftar akun gratis.
2. Setelah masuk ke dashboard, pilih **"Create a Deployment"** atau **"Build a Database"**.
3. Pilih opsi **M0 (Free)**.
4. Pilih Cloud Provider (**AWS** atau **Google Cloud**) dan Region terdekat (**Singapore / ap-southeast-1**).
5. Klik **"Create"**.

### Langkah 2: Buat Kredensial Pengguna Database
1. Pada menu **Security** $\to$ **Database Access**:
   - Klik **"Add New Database User"**.
   - Masukkan **Username** (contoh: `admin_tj`) dan **Password** yang aman (contoh: `SandiRahasia2026!`).
   - Berikan hak akses **Read and write to any database**.
   - Klik **"Add User"**.

### Langkah 3: Konfigurasi Akses Jaringan (IP Whitelist)
1. Pada menu **Security** $\to$ **Network Access**:
   - Klik **"Add IP Address"**.
   - Pilih opsi **"Allow Access from Anywhere"** (`0.0.0.0/0`). *(Diperlukan agar hosting cloud seperti Render atau koneksi dinamis dapat terhubung)*.
   - Klik **"Confirm"**.

### Langkah 4: Salin Connection String
1. Kembali ke menu **Database / Deployment**, klik tombol **"Connect"** pada cluster Anda.
2. Pilih opsi **"Drivers"** (Node.js).
3. Salin URL koneksi yang muncul, formatnya seperti ini:
   ```
   mongodb+srv://admin_tj:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
4. Ganti `<password>` dengan sandi yang Anda buat pada Langkah 2, dan tambahkan nama database `/tanyajawab` sebelum tanda tanya:
   ```
   mongodb+srv://admin_tj:SandiRahasia2026!@cluster0.abcde.mongodb.net/tanyajawab?retryWrites=true&w=majority
   ```

---

## 🚀 Bagian 2: Cara Menguji MongoDB di Lokal

Jika Anda ingin menjalankan aplikasi di komputer lokal dengan database MongoDB Atlas:

1. Buka file `.env` di folder `backend/.env`:
   ```env
   PORT=5001
   JWT_SECRET=tanyajawab_secret_key_2026_super_secure
   MONGO_URI=mongodb+srv://admin_tj:SandiRahasia2026!@cluster0.abcde.mongodb.net/tanyajawab?retryWrites=true&w=majority
   ```
2. Jalankan aplikasi:
   ```bash
   npm run start:full
   ```
3. Di terminal akan muncul log:
   ```
   [Database] Menghubungkan ke MongoDB di mongodb+srv://admin_tj:****@cluster0...
   ✅ [Database] Berhasil terhubung ke MongoDB native!
   ```

---

## 🌐 Bagian 3: Deploy Online Gratis ke Render.com

Render.com adalah platform cloud hosting yang sangat cocok untuk aplikasi ini karena mendukung Node.js, Express, dan koneksi realtime **Server-Sent Events (SSE)** tanpa batas waktu pemutusan singkat.

### Langkah-langkah Deploy di Render:
1. **Push Proyek ke Repositori GitHub**:
   - Inisialisasi git dan unggah folder proyek `tanyajawab` ke akun GitHub Anda (bisa repositori *Private* atau *Public*).
     ```bash
     git init
     git add .
     git commit -m "feat: initial commit tanyajawab app"
     git branch -M main
     git remote add origin https://github.com/USERNAME/NAMA-REPO.git
     git push -u origin main
     ```

2. **Daftar di Render.com**:
   - Buka [https://render.com](https://render.com) dan login menggunakan akun GitHub Anda.

3. **Buat Web Service Baru**:
   - Klik tombol **"New +"** $\to$ pilih **"Web Service"**.
   - Hubungkan (*connect*) ke repositori GitHub yang baru saja Anda unggah.
   - Render akan otomatis mendeteksi file konfigurasi atau Anda dapat mengisi pengaturan berikut:
     - **Name**: `tanyajawab-app` (atau nama pilihan Anda)
     - **Region**: `Singapore`
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**: `cd frontend && npm install && npm run build && cd ../backend && npm install`
     - **Start Command**: `cd backend && npm start`
     - **Instance Type**: `Free`

4. **Atur Variabel Lingkungan (Environment Variables)**:
   - Scroll ke bawah ke bagian **Environment Variables**, tambahkan:
     - `NODE_ENV`: `production`
     - `JWT_SECRET`: `tanyajawab_super_secure_jwt_cloud_key_2026`
     - `MONGO_URI`: *(Tempelkan URL MongoDB Atlas yang Anda dapatkan dari Bagian 1)*

5. **Deploy**:
   - Klik **"Create Web Service"**.
   - Render akan mem-build aplikasi dan meluncurkannya secara otomatis dalam waktu ~2 menit.
   - Anda akan mendapatkan link HTTPS publik resmi, misalnya:
     `https://tanyajawab-app.onrender.com`
   - Semua peserta di ruangan sosialisasi dapat langsung mengakses alamat tersebut lewat browser smartphone masing-masing!

---

## 🐳 Bagian 4: Deploy Menggunakan Docker (VPS / Server Sendiri)

Jika Anda memiliki server VPS (DigitalOcean, AWS EC2, Linode, Ubuntu/Debian) atau ingin menjalankan container di komputer:

1. **Jalankan dengan Docker Compose**:
   Di folder proyek utama, cukup jalankan satu perintah:
   ```bash
   docker compose up -d
   ```
   Docker akan:
   - Mengunduh image resmi `mongo:6.0` dan menyimpannya di volume persisten `mongo_data`.
   - Membangun image aplikasi (`Dockerfile` multi-stage: build React Vite dan server Node.js).
   - Mengaktifkan aplikasi di port `5001`.

2. **Periksa Status Container**:
   ```bash
   docker compose ps
   ```

3. **Melihat Log Aplikasi**:
   ```bash
   docker compose logs -f app
   ```

4. **Menghentikan Container**:
   ```bash
   docker compose down
   ```

---

## 🪂 Bagian 5: Deploy ke Fly.io (Cepat, Latensi Rendah & Mendukung Volume)

Fly.io adalah platform cloud modern yang menjalankan container aplikasi langsung di dekat pengguna (edge computing). Region **Singapore (`sin`)** sangat ideal untuk pengguna di Indonesia dengan latensi sangat rendah (~15-30 ms).

### Langkah-langkah Deploy di Fly.io:

1. **Pasang Fly CLI (`flyctl`)**:
   Jika menggunakan Mac:
   ```bash
   brew install flyctl
   ```
   Atau via script instalasi resmi:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login ke Akun Fly.io**:
   ```bash
   fly auth login
   ```
   *(Akan membuka browser untuk login / registrasi akun gratis).*

3. **Inisialisasi Aplikasi**:
   Di folder proyek utama `/Users/mohamadsolikin/tanyajawab`:
   ```bash
   fly launch --no-deploy
   ```
   - Pilih nama aplikasi yang unik (atau biarkan default).
   - Pilih region **Singapore (`sin`)**.
   - Jika ditanya ingin menggunakan `fly.toml` yang sudah ada, pilih **Yes**.

4. **Buat Persistent Volume untuk Berkas Upload**:
   Agar berkas bukti / foto yang diunggah peserta tetap tersimpan saat aplikasi diperbarui/redeploy:
   ```bash
   fly volumes create uploads_data --region sin --size 1
   ```

5. **Atur Variabel Lingkungan & Rahasia (Secrets)**:
   Masukkan connection string MongoDB Atlas dan JWT secret:
    ```bash
    # Menggunakan Cluster MongoDB Atlas Anda (ganti <PASSWORD_ANDA>):
    fly secrets set MONGO_URI="mongodb+srv://admin_tj:<PASSWORD_ANDA>@cluster0.pjjntvt.mongodb.net/tanyajawab?retryWrites=true&w=majority" JWT_SECRET="tanyajawab_super_secure_jwt_cloud_key_2026"
    ```
6. **Deploy Aplikasi ke Fly.io**:
   ```bash
   fly deploy
   ```
   Fly.io akan otomatis membaca `Dockerfile`, membangun aplikasi React & Node.js, dan meluncurkannya ke edge server Singapore.

7. **Buka Aplikasi**:
   ```bash
   fly open
   ```
   Aplikasi Anda langsung aktif dengan domain HTTPS gratis:
   `https://NAMA-APLIKASI-ANDA.fly.dev`

---

## 🛡️ Akses Portal Admin

Setelah aplikasi aktif di cloud maupun lokal:
- **Layar Publik Peserta**: Buka domain utama (misal: `https://tanyajawab-app.onrender.com` atau `http://IP_SERVER:5001`)
- **Portal Admin Tersembunyi**: Buka link langsung `/admin` (misal: `https://tanyajawab-app.onrender.com/admin`)
- **Kredensial Default**:
  - Username: `admin_utama`
  - Kata Sandi: `admin123`

