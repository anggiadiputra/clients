# 🚀 Panduan Deployment CloudPanel (crm.diurusin.id & apis.diurusin.id)

Panduan langkah demi langkah untuk melakukan **Deploy Awal** dan **Update Kode (`git pull`)** pada aplikasi Client CRM di VPS CloudPanel.

---

## 📌 Detail Environment & Domain

| Layer | Domain | SSH User | Root Path Htdocs |
| :--- | :--- | :--- | :--- |
| **Frontend** | `crm.diurusin.id` | `diurusin-crm` | `/home/diurusin-crm/htdocs/crm.diurusin.id` |
| **Backend API** | `apis.diurusin.id` | `diurusin-apis` | `/home/diurusin-apis/htdocs/apis.diurusin.id` |

> **Repository Git**: `https://github.com/anggiadiputra/clients.git`

---

## 🗄️ Langkah 1: Buat Database MySQL di CloudPanel

1. Buka **CloudPanel Admin Dashboard**.
2. Masuk ke **Databases** -> Klik **Add Database**.
3. Isi data database:
   - **Database Name**: `diurusin_crm`
   - **Database User**: `diurusin_user`
   - **Password**: *(Buat password yang kuat dan catat)*
4. Klik **Create Database**.

---

## ⚙️ Langkah 2: Deployment BACKEND (`apis.diurusin.id`)

### 1. SSH & Clone Repositori
Login ke VPS via SSH sebagai user `diurusin-apis` (atau `root`), lalu masuk ke folder domain backend:
```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id

# Jika folder htdocs belum kosong, bersihkan dulu
rm -rf *

# Clone repository langsung ke folder saat ini (perhatikan tanda titik '.' di akhir)
git clone https://github.com/anggiadiputra/clients.git .
```
> 💡 **Tips**: Tanda titik `.` di akhir perintah `git clone` memastikan semua file di-clone **langsung** ke dalam `/home/diurusin-apis/htdocs/apis.diurusin.id/` (sehingga struktur folder menjadi `apis.diurusin.id/backend`), bukan membuat subfolder baru `apis.diurusin.id/clients/backend`.

### 2. Setup Environment Variable Backend (`.env`)
Buat file `.env` di dalam folder `backend/`:
```bash
nano backend/.env
```
Isi konfigurasi berikut:
```env
PORT=3003
NODE_ENV=production

# Sesuaikan DB_NAME, DB_USER, DB_PASSWORD dari Langkah 1
DATABASE_URL="mysql://diurusin_user:PASSWORD_DATABASE_ANDA@127.0.0.1:3306/diurusin_crm"

# JWT Secret (Ganti dengan karakter acak & aman)
JWT_SECRET="ganti_dengan_jwt_secret_super_aman_diurusin_123"
```

### 3. Install, Migrate DB & Build
Jalankan perintah berikut:
```bash
cd backend
npm install
npx prisma db push
npm run prisma:gen
npm run seed
npm run build
```

### 4. Jalankan Service Backend dengan PM2
```bash
# Pastikan PM2 terinstall (jika belum: sudo npm install -g pm2)
pm2 start ecosystem.config.cjs
pm2 save
```

### 5. Konfigurasi Reverse Proxy Nginx di CloudPanel
1. Di **CloudPanel Dashboard**, pilih Site **`apis.diurusin.id`**.
2. Masuk ke menu **Vhost**.
3. Edit Vhost Nginx, arahkan `location /` ke port `3003`:
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3003;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
4. Simpan Vhost & Aktifkan **SSL Let's Encrypt** pada tab **SSL/TLS**.

---

## 🎨 Langkah 3: Deployment FRONTEND (`crm.diurusin.id`)

### 1. SSH & Clone Repositori
Login ke VPS via SSH sebagai user `diurusin-crm` (atau `root`), lalu masuk ke folder domain frontend:
```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id

# Bersihkan folder jika ada file default index.html
rm -rf *

# Clone repository
git clone https://github.com/anggiadiputra/clients.git .
```

### 2. Setup Environment Variable Frontend (`.env`)
Buat file `.env` di dalam folder `frontend/`:
```bash
nano frontend/.env
```
Isi dengan URL Backend API:
```env
VITE_API_URL=https://apis.diurusin.id
```

### 3. Install Dependencies & Build Frontend
```bash
cd frontend
npm install
npm run build
```
Hasil kompilasi akan berada di `/home/diurusin-crm/htdocs/crm.diurusin.id/frontend/dist`.

### 4. Konfigurasi Root Folder & SPA Routing di CloudPanel Vhost
1. Di **CloudPanel Dashboard**, pilih Site **`crm.diurusin.id`**.
2. Masuk ke menu **Vhost**.
3. Ubah directive `root` agar mengarah ke folder build `frontend/dist`:
   ```nginx
   root /home/diurusin-crm/htdocs/crm.diurusin.id/frontend/dist;
   ```
4. Tambahkan aturan routing SPA (Single Page Application) di dalam `location /`:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```
5. Simpan Vhost & Aktifkan **SSL Let's Encrypt** pada tab **SSL/TLS**.

---

## 🔄 Langkah 4: Panduan UPDATE Kode (`git pull`)

Setiap ada perubahan kode baru yang sudah di-push ke GitHub repository `main`, Anda cukup menjalankan script update otomatis yang sudah disediakan.

### 1. Update BACKEND (`apis.diurusin.id`)
Buka terminal SSH dan jalankan:
```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id/backend
bash deploy.sh
```
> Script ini akan otomatis melakukan: `git pull`, `npm install`, `npx prisma db push`, `npm run build`, dan `pm2 restart`.

---

### 2. Update FRONTEND (`crm.diurusin.id`)
Buka terminal SSH dan jalankan:
```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id/frontend
bash deploy.sh
```
> Script ini akan otomatis melakukan: `git pull`, `npm install`, dan `npm run build`.

---

## 🔍 TroubleShooting & Cek Log

- **Cek Status Service Backend (PM2)**:
  ```bash
  pm2 status
  pm2 logs crm-backend
  ```
- **Tes API Backend**:
  ```bash
  curl -I https://apis.diurusin.id/health
  ```
