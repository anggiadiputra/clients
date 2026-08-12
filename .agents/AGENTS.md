# Project Rules

## Deployment / Git Pull Commands

### 1. Backend (BE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Backend (BE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git reset --hard origin/main && git pull origin main && rm -rf frontend public src tsconfig*.json && cd backend && npm install && npm run build && chown -R diurusin-apis:diurusin-apis /home/diurusin-apis/htdocs/apis.diurusin.id/ && su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && pm2 restart crm-backend"
```

**Catatan:**
- `git reset --hard origin/main` memulihkan seluruh file source code yang mungkin sempat terhapus di working tree server
- `git pull` dilakukan di root `apis.diurusin.id`
- Menghapus folder/file sisa frontend (`frontend`, `public`, `src`, `tsconfig*.json`) di root agar tidak terjadi bentrokan kompilasi `tsc`
- Masuk ke `cd backend` untuk menjalankan `npm install` dan `npm run build` (menghasilkan `dist/index.js` di root)
- PM2 merestart service `crm-backend`

### 2. Frontend (FE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Frontend (FE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id && git reset --hard origin/main && git pull origin main && rm -rf backend src public index.html tsconfig*.json && cd frontend && VITE_API_URL=https://apis.diurusin.id npm install && npm run build && chown -R diurusin-crm:diurusin-crm /home/diurusin-crm/htdocs/crm.diurusin.id/
```

**Catatan:**
- `git reset --hard origin/main` memulihkan seluruh file source code yang mungkin sempat terhapus di working tree server
- Menghapus folder sisa backend & root lama (`backend`, `src`, `public`, `index.html`, `tsconfig*.json`) secara otomatis agar server FE selalu rapi & bebas bentrokan build.
- Setelah build, clear Cloudflare cache: Cloudflare Dashboard → Caching → Purge Everything
