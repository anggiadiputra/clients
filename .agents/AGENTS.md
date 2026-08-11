# Project Rules

## Deployment / Git Pull Commands

### 1. Backend (BE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Backend (BE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git pull origin main && su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && npm install && npm run build && pm2 restart crm-backend"
```

**Catatan penting:**
- `git pull` dijalankan sebagai root (karena SSH key/credentials dikonfigurasi untuk root)
- `npm install`, `npm run build`, dan `pm2 restart` dijalankan sebagai user `diurusin-apis` via `su -`
- Ini mencegah file `dist/` ter-create dengan ownership root yang bisa menyebabkan permission issues

Jika ingin force clean build (dist lama dihapus dulu):
```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git pull origin main && su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && rm -rf dist && npm install && npm run build && pm2 restart crm-backend"
```

Jika ada masalah permission (dist masih milik root), fix dulu:
```bash
chown -R diurusin-apis:diurusin-apis /home/diurusin-apis/htdocs/apis.diurusin.id/
```

### 2. Frontend (FE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Frontend (FE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id && git pull origin main && echo "VITE_API_URL=https://apis.diurusin.id" > .env && npm install && npm run build
```

**Catatan:**
- FE adalah static files yang di-serve oleh webserver (nginx), file ownership root OK selama world-readable
- Setelah build, clear Cloudflare cache jika halaman tidak update: Cloudflare Dashboard → Caching → Purge Everything
