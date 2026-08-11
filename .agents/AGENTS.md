# Project Rules

## Deployment / Git Pull Commands

### 1. Backend (BE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Backend (BE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git pull origin main && npm install && npm run build && chown -R diurusin-apis:diurusin-apis /home/diurusin-apis/htdocs/apis.diurusin.id/ && su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && pm2 restart crm-backend"
```

### 2. Frontend (FE) Git Pull Command (Metode rsync)
Jika user menanyakan perintah git pull / deployment Frontend (FE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id && git pull origin main && cd frontend && VITE_API_URL=https://apis.diurusin.id npm install && npm run build && rsync -av --delete dist/ /home/diurusin-crm/htdocs/crm.diurusin.id/dist/ && chown -R diurusin-crm:diurusin-crm /home/diurusin-crm/htdocs/crm.diurusin.id/
```

**Catatan penting:**
- `git pull` dilakukan di root repositori `crm.diurusin.id`
- Build dilakukan di `frontend/` (menghasilkan `frontend/dist/`)
- `rsync -av --delete dist/ /home/diurusin-crm/htdocs/crm.diurusin.id/dist/` menyinkronkan hasil build ke folder public Nginx dan menghapus aset lama secara otomatis tanpa membuat folder `dist` liar di luar
- `chown -R diurusin-crm:diurusin-crm` meriset hak milik seluruh folder agar webserver `diurusin-crm` dapat membaca aset tanpa masalah permission
- Setelah build, clear Cloudflare cache: Cloudflare Dashboard → Caching → Purge Everything
