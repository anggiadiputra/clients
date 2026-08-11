# Project Rules

## Deployment / Git Pull Commands

### 1. Backend (BE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Backend (BE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git pull origin main && npm install && npm run build && chown -R diurusin-apis:diurusin-apis /home/diurusin-apis/htdocs/apis.diurusin.id/ && su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && pm2 restart crm-backend"
```

**Catatan penting:**
- `git pull`, `npm install`, dan `npm run build` dijalankan sebagai root (atau pengguna aktif)
- `chown -R diurusin-apis:diurusin-apis` meriset hak milik seluruh folder agar user `diurusin-apis` memiliki hak penuh atas `dist/` dan `node_modules/`
- `pm2 restart` dijalankan sebagai user `diurusin-apis` via `su -`

Jika ingin force clean build (dist lama dihapus dulu):
```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git pull origin main && rm -rf dist && npm install && npm run build && chown -R diurusin-apis:diurusin-apis /home/diurusin-apis/htdocs/apis.diurusin.id/ && su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && pm2 restart crm-backend"
```

### 2. Frontend (FE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Frontend (FE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id && git pull origin main && cd frontend && VITE_API_URL=https://apis.diurusin.id npm install && npm run build && chown -R diurusin-crm:diurusin-crm /home/diurusin-crm/htdocs/crm.diurusin.id/
```

**Catatan penting:**
- `git pull` dilakukan di root repositori `crm.diurusin.id`
- Build dijalankan di subdirectory `frontend/` dengan `VITE_API_URL=https://apis.diurusin.id` sehingga Vite menghasilkan output langsung ke `/home/diurusin-crm/htdocs/crm.diurusin.id/dist/`
- `chown -R diurusin-crm:diurusin-crm` meriset hak milik seluruh folder agar webserver/user `diurusin-crm` dapat mengakses file `dist/` tanpa kendala permission
- Setelah build, clear Cloudflare cache jika halaman tidak update: Cloudflare Dashboard → Caching → Purge Everything
