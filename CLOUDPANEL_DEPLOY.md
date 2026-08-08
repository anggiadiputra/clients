# 🚀 Panduan Deployment CloudPanel (crm.diurusin.id & apis.diurusin.id)

Panduan langkah demi langkah untuk melakukan **Deploy Awal** dan **Update Kode (`git pull`)** pada aplikasi Client CRM di VPS CloudPanel.

---

## 📌 Detail Environment & Path Domain

| Layer | Domain | Path Root Domain | Target Root Build / Dist |
| :--- | :--- | :--- | :--- |
| **Backend API** | `apis.diurusin.id` | `/home/diurusin-apis/htdocs/apis.diurusin.id` | N/A (Port 3003) |
| **Frontend UI** | `crm.diurusin.id` | `/home/diurusin-crm/htdocs/crm.diurusin.id` | `/home/diurusin-crm/htdocs/crm.diurusin.id/dist` |

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

### 1. Pindahkan File Backend ke Root Domain (Jika di-clone dalam subfolder)
```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id
shopt -s dotglob
mv clients/backend/* .
rm -rf clients
```

### 2. Setup Environment Variable Backend (`.env`)
```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id
nano .env
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
```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id
npm install
npx prisma db push
npm run prisma:gen
npm run seed
npm run build
```

### 4. Jalankan Service Backend dengan PM2
```bash
pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
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

### 1. Pindahkan File Frontend ke Root Domain
```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id
shopt -s dotglob
mv clients/frontend/* .
rm -rf clients
```

### 2. Setup Environment Variable Frontend (`.env`)
```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id
nano .env
```
Isi dengan URL Backend API:
```env
VITE_API_URL=https://apis.diurusin.id
```

### 3. Install Dependencies & Build Frontend
```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id
npm install
npm run build
```
Hasil kompilasi file statis akan berada di `/home/diurusin-crm/htdocs/crm.diurusin.id/dist`.

### 4. Konfigurasi Root Folder & SPA Routing di CloudPanel Vhost
1. Di **CloudPanel Dashboard**, pilih Site **`crm.diurusin.id`**.
2. Masuk ke menu **Vhost**.
3. Ubah directive `root` agar mengarah ke folder build `dist`:
   ```nginx
   root /home/diurusin-crm/htdocs/crm.diurusin.id/dist;
   ```
4. Tambahkan aturan routing SPA (Single Page Application) di dalam `location /`:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```
5. Simpan Vhost & Aktifkan **SSL Let's Encrypt** pada tab **SSL/TLS**.

---

## 🔄 Langkah 4: Perintah UPDATE Kode Masa Mendatang (`git pull`)

### ⚠️ Jika Muncul Error `fatal: detected dubious ownership` atau `not a git repository`
Jalankan perintah **Fix 1-Liner** di bawah ini (akan otomatis menambahkan `safe.directory` dan menginisialisasi repository Git):

#### 🛠️ Fix & Build — FRONTEND (`crm.diurusin.id`):
```bash
git config --global --add safe.directory '*' && cd /home/diurusin-crm/htdocs/crm.diurusin.id && git init 2>/dev/null || true && git remote remove origin 2>/dev/null || true && git remote add origin https://github.com/anggiadiputra/clients.git && git fetch origin && git reset --hard origin/main && cd frontend && echo "VITE_API_URL=https://apis.diurusin.id" > .env && npm install && npm run build
```

#### 🛠️ Fix & Build — BACKEND (`apis.diurusin.id`):
```bash
git config --global --add safe.directory '*' && cd /home/diurusin-apis/htdocs/apis.diurusin.id && git init 2>/dev/null || true && git remote remove origin 2>/dev/null || true && git remote add origin https://github.com/anggiadiputra/clients.git && git fetch origin && git reset --hard origin/main && cd backend && cp ../.env .env 2>/dev/null || true && npm install && npx prisma db push && npm run build && pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
```

---

### ⚡ 1-Liner Update Rutin Masa Mendatang

#### Update FRONTEND Dashboard (`crm.diurusin.id`):
```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id && git fetch origin && git reset --hard origin/main && cd frontend && echo "VITE_API_URL=https://apis.diurusin.id" > .env && npm install && npm run build
```

#### Update BACKEND API (`apis.diurusin.id`):
```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git fetch origin && git reset --hard origin/main && cd backend && cp ../.env .env 2>/dev/null || true && npm install && npx prisma db push && npm run build && pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
```

---

## 🔍 TroubleShooting & Cek Log

- **SSL Let's Encrypt 404 Error (`/.well-known/acme-challenge`)**:
  Jika terjadi error 404 saat request SSL pada `crm.diurusin.id`, tambahkan blok ini di Vhost CloudPanel di atas `location /`:
  ```nginx
  location ^~ /.well-known/acme-challenge/ {
      allow all;
      root /home/diurusin-crm/htdocs/crm.diurusin.id;
      default_type "text/plain";
      try_files $uri =404;
  }
  ```
  Atau buat symlink via SSH: `ln -sfn /home/diurusin-crm/htdocs/crm.diurusin.id/.well-known /home/diurusin-crm/htdocs/crm.diurusin.id/dist/.well-known`

- **Cek Status Service Backend (PM2)**:
  ```bash
  pm2 status
  pm2 logs crm-backend
  ```
- **Tes API Backend**:
  ```bash
  curl -I https://apis.diurusin.id/health
  ```


---

## 🔑 Kredensial Default Seed Admin
- **Email**: `admin@example.com` (atau sesuai ADMIN_EMAIL di .env)
- **Password**: `admin123456`
