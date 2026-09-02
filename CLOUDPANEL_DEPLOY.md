# 🚀 Panduan Deployment CloudPanel (crm.diurusin.id & apis.diurusin.id)

Panduan resmi untuk **Deploy Awal**, **Update Kode**, dan **Rollback** aplikasi Client CRM di VPS CloudPanel — ditulis ulang berdasarkan kondisi server aktual (diverifikasi 2026-09-02, deploy commit `f319f29`).

---

## 📌 1. Arsitektur & Path

| Layer | Domain | User VPS | Path Root | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** | `apis.diurusin.id` | `diurusin-apis` | `/home/diurusin-apis/htdocs/apis.diurusin.id` | Node.js port 3003, PM2 `crm-backend` |
| **Frontend UI** | `crm.diurusin.id` | `diurusin-crm` | `/home/diurusin-crm/htdocs/crm.diurusin.id` | Static build, nginx root = `dist/` |

> **Repository Git**: `https://github.com/anggiadiputra/clients.git` (branch **`main`**)

### ⚠️ Penting: Pola "Monorepo Split" — pahami dulu sebelum deploy

Kedua domain memakai **repo yang sama**, di-clone penuh di root domain masing-masing. Struktur fisiknya:

```
apis.diurusin.id/          ← .git ADA di sini (checkout penuh repo)
├── .git/                  ← git hanya melacak folder backend/ & frontend/ repo
├── backend/               ← dari repo (SOURCE untuk build)
├── frontend/              ← dari repo (tidak dipakai di sisi BE)
├── .env                   ← UNTRACKED — konfigurasi produksi, JANGAN PERNAH hilang
├── node_modules/          ← UNTRACKED — runtime ROOT (dipakai PM2)
├── prisma/                ← UNTRACKED — salinan schema untuk runtime root
├── dist/                  ← UNTRACKED — hasil build (dipakai PM2: dist/index.js)
├── package.json           ← UNTRACKED — salinan runtime dari backend/package.json
└── ecosystem.config.cjs   ← UNTRACKED — konfigurasi PM2

crm.diurusin.id/           ← .git ADA di sini (checkout penuh repo)
├── .git/
├── frontend/              ← dari repo (SOURCE untuk build, punya node_modules sendiri)
├── backend/               ← dari repo (tidak dipakai di sisi FE)
├── dist/                  ← UNTRACKED — hasil build (nginx root)
└── package.json, vite.config.ts, dll — sisa proses deploy awal (UNTRACKED)
```

Konsekuensi yang WAJIB dipahami:
1. **`git reset --hard` AMAN** untuk `.env`, `node_modules`, `dist` — semua untracked, tidak tersentuh git.
2. **JANGAN PERNAH `git clean -fd`** di BE — `node_modules/` root TIDAK ter-ignore dan akan TERHAPUS (dibuktikan saat audit 2026-09-02).
3. **Build BE dilakukan dari `backend/`** tapi hasilnya (outDir `../dist`) jatuh ke dist ROOT, dan **prisma generate + node_modules ROOT** yang dipakai runtime. Kedua tempat harus disiapkan (lihat alur update).
4. Status git akan selalu tampak "dirty" (folder cross-repo ter-delete: BE menghapus `frontend/`, FE menghapus `backend/`) — **itu normal** untuk pola split ini, bukan konflik.

---

## ⚡ 2. Update Rutin (git pull)

> Prasyarat: semua perubahan sudah **commit + push ke `origin/main`** dari lokal (`Downloads/Clients`). Jangan pernah mengedit kode langsung di VPS.

### 🟢 A. Update BACKEND (`apis.diurusin.id`)

Jalankan sebagai **root**:

```bash
set -e
APP=/home/diurusin-apis/htdocs/apis.diurusin.id

# 1. Backup dulu (murah daripada menyesal)
BK=/root/diurusin-be-backup-$(date +%Y%m%d-%H%M)
mkdir -p "$BK"
cp -a "$APP/.env" "$APP/package.json" "$APP/prisma" "$APP/dist" "$BK/"

# 2. Sinkronkan source dengan GitHub
cd "$APP"
git fetch origin
git reset --hard origin/main     # JANGAN git clean di sini!

# 3. Install dependency & build dari backend/ (hasil masuk ke dist ROOT)
cd "$APP/backend"
cp "$APP/.env" .env
su - diurusin-apis -c "cd $APP/backend && npm install --no-audit --no-fund && npx prisma db push --schema=prisma/schema.prisma && npm run build"

# 4. Sinkronkan runtime ROOT (package.json + schema + prisma client ROOT)
cp "$APP/backend/package.json" "$APP/package.json"
cp "$APP/backend/prisma/schema.prisma" "$APP/prisma/schema.prisma"
su - diurusin-apis -c "cd $APP && npm install --no-audit --no-fund && npx prisma generate --schema=prisma/schema.prisma --skip-generate 2>/dev/null || npx prisma generate --schema=prisma/schema.prisma"

# 5. Restart via user yang benar + health check
su - diurusin-apis -c "pm2 restart crm-backend --update-env && pm2 save"
sleep 4
curl -fsS https://apis.diurusin.id/api/setup/status && echo " ✔ BE OK"
```

**Kenapa langkah 4 wajib:** runtime PM2 berjalan dari ROOT (`dist/index.js` + `node_modules` root). Jika prisma client hanya ter-generate di `backend/node_modules`, PM2 akan crash dengan `@prisma/client did not initialize yet` (kejadian nyata 2026-09-02). Jika dependency baru ditambahkan di repo, `package.json` root juga harus disinkronkan + `npm install` di root.

**Health check yang benar untuk BE ini** (tidak punya route `/` atau `/health` — 404 di root adalah NORMAL):
- `https://apis.diurusin.id/api/setup/status` → harus `200`
- `https://apis.diurusin.id/api/clients` tanpa token → harus `401` (auth guard hidup)

### 🔵 B. Update FRONTEND (`crm.diurusin.id`)

```bash
set -e
APP=/home/diurusin-crm/htdocs/crm.diurusin.id

# 1. Backup dist
BK=/root/diurusin-fe-backup-$(date +%Y%m%d-%H%M)
mkdir -p "$BK" && cp -a "$APP/dist" "$BK/"

# 2. Sinkronkan source + build dari frontend/ (outDir ../dist → dist ROOT otomatis)
cd "$APP"
git fetch origin
git reset --hard origin/main
cd "$APP/frontend"
echo "VITE_API_URL=https://apis.diurusin.id" > .env
su - diurusin-crm -c "cd $APP/frontend && npm install --no-audit --no-fund && npm run build"

# 3. Health check
curl -fsS -o /dev/null -w "FE: %{http_code}\n" https://crm.diurusin.id/
```

Frontend tidak perlu restart apa pun — statis; user cukup hard-refresh (nama bundle baru ber-hash baru).

---

## 🔙 3. Rollback

```bash
# BACKEND — kembalikan backup (atau reset ke commit lama lalu ulangi build)
APP=/home/diurusin-apis/htdocs/apis.diurusin.id
BK=/root/diurusin-be-backup-<tanggal>
cp -a "$BK/.env" "$BK/package.json" "$APP/"
cp -a "$BK/prisma" "$APP/"
cp -a "$BK/dist" "$APP/"
cd "$APP" && git reset --hard <commit-lama>
su - diurusin-apis -c "cd $APP && npm install --no-audit --no-fund && pm2 restart crm-backend"
```

```bash
# FRONTEND — kembalikan dist lama
cp -a /root/diurusin-fe-backup-<tanggal>/dist/. /home/diurusin-crm/htdocs/crm.diurusin.id/dist/
```

---

## 🛠️ 4. Deploy Awal (Setup Pertama Kali)

### 4.1 Database (CloudPanel)

1. CloudPanel → **Databases** → **Add Database**
   - Name: `diurusincrm`, User: `diurusinuser`, password kuat (catat!)

### 4.2 Backend

```bash
# sebagai root
cd /home/diurusin-apis/htdocs
git clone https://github.com/anggiadiputra/clients.git apis.diurusin.id

cd apis.diurusin.id
# .env produksi (JANGAN pernah di-commit)
cat > .env <<'EOF'
PORT=3003
NODE_ENV=production
DATABASE_URL="mysql://diurusinuser:<password>@127.0.0.1:3306/diurusincrm"
JWT_SECRET="<string-acak-minimal-32-karakter>"
EOF
chmod 640 .env && chown diurusin-apis:diurusin-apis .env

# build + runtime root (ikuti alur bagian 2A langkah 3-4)
# seed admin awal (SAKALI SAJA di awal):
cd backend && cp ../.env .env
su - diurusin-apis -c "cd $PWD && npx prisma db push && npm run seed"
```

Daftarkan PM2 sebagai user `diurusin-apis`:
```bash
su - diurusin-apis
cd /home/diurusin-apis/htdocs/apis.diurusin.id
pm2 start ecosystem.config.cjs   # name: crm-backend, dist/index.js, port 3003
pm2 save
```

Aktifkan unit systemd (auto-start setelah reboot):
```bash
# sebagai root — /etc/systemd/system/pm2-diurusin-apis.service sudah terpasang di server ini
systemctl enable --now pm2-diurusin-apis.service
```

> Unit systemd ini dipasang 2026-09-02 — sebelumnya `crm-backend` TIDAK naik otomatis setelah reboot.

### 4.3 Frontend

```bash
cd /home/diurusin-crm/htdocs
git clone https://github.com/anggiadiputra/clients.git crm.diurusin.id
cd crm.diurusin.id/frontend
echo "VITE_API_URL=https://apis.diurusin.id" > .env
# sebagai user diurusin-crm:
npm install && npm run build   # outDir ../dist → dist/ di root domain
```

### 4.4 Nginx Vhost (CloudPanel)

**`apis.diurusin.id`** — reverse proxy ke port 3003:
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

**`crm.diurusin.id`** — static SPA + proxy `/api/` ke backend:
```nginx
root /home/diurusin-crm/htdocs/crm.diurusin.id/dist;
index index.html;

location /api/ {
    proxy_pass http://127.0.0.1:3003/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    try_files $uri $uri/ /index.html;
}

location ^~ /.well-known/acme-challenge/ {
    allow all;
    root /home/diurusin-crm/htdocs/crm.diurusin.id;
    default_type "text/plain";
    try_files $uri =404;
}
```

Lalu aktifkan SSL Let's Encrypt di tab SSL/TLS untuk kedua site.

---

## 🔍 5. Troubleshooting (berdasarkan kejadian nyata)

| Gejala | Akar masalah | Solusi |
| :--- | :--- | :--- |
| PM2 `crm-backend` status **errored**, log: `@prisma/client did not initialize yet` | Prisma client hanya ter-generate di `backend/node_modules`, padahal runtime pakai `node_modules` ROOT | `su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && npx prisma generate --schema=prisma/schema.prisma"` lalu `pm2 restart crm-backend` |
| `prisma db push` menolak: *"about to drop the column tokenVersion"* | `prisma/schema.prisma` di ROOT masih versi lama (tidak sinkron dengan repo) | `cp backend/prisma/schema.prisma prisma/schema.prisma` lalu push ulang. **JANGAN asal `--accept-data-loss`** |
| `git pull` error / konflik | Ada edit lokal di checkout VPS | Pakai alur bagian 2 (`fetch + reset --hard`). Semua file penting (`.env`, `dist`, `node_modules`) untracked dan aman |
| `fatal: detected dubious ownership` | Git root vs user eksekusi berbeda | `git config --global --add safe.directory /home/diurusin-apis/htdocs/apis.diurusin.id` (dan path FE) |
| BE 404 di `/` atau `/health` | **Normal** — backend ini tidak punya route root/health | Gunakan `/api/setup/status` (200) dan `/api/clients` (401) sebagai health check |
| Dependency baru (mis. `helmet`) tidak terpasang saat runtime | `package.json` ROOT masih lama | `cp backend/package.json package.json && npm install` di root (langkah 4 alur 2A) |
| Setelah reboot VPS, backend mati | (Sejarah: dulu tanpa systemd) | Sudah diperbaiki — unit `pm2-diurusin-apis.service` enabled; cek `systemctl status pm2-diurusin-apis` |
| SSL Let's Encrypt 404 saat validasi | ACME challenge tidak terjangkau dari dist/ | Blok `location ^~ /.well-known/acme-challenge/` di vhost (lihat 4.4) |

**Cek log:**
```bash
su - diurusin-apis -c "pm2 logs crm-backend --lines 50"
journalctl -u pm2-diurusin-apis.service -n 50
```

---

## 📌 6. Aturan Emas

1. **Satu arah**: lokal → GitHub → VPS. Jangan edit kode di VPS.
2. **`.env` produksi hanya hidup di server** — tidak pernah di-commit; backup-nya disimpan terpisah dan rahasia.
3. **Jangan `git clean`** di BE — `node_modules` root tidak ter-ignore.
4. **Build BE selalu dua sisi**: `backend/` (source) dan ROOT (prisma generate + npm install) — keduanya dipakai runtime.
5. **Restart PM2 selalu sebagai `diurusin-apis`** (`su - diurusin-apis -c "pm2 restart crm-backend"`), restart sebagai root menciptakan proses yatim milik root.
6. **Deploy = pull + build + sync + restart + health check** (`/api/setup/status` 200). Gagal → rollback (bagian 3), bukan tambal sulam.

---

## 🔑 Kredensial Seed Admin (hanya deploy awal)

- **Email**: `admin@example.com` (atau sesuai `ADMIN_EMAIL` di `.env`)
- **Password**: `admin123456` — **WAJIB diganti segera** setelah login pertama.