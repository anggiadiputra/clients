# Project Rules

## Deployment / Git Pull Commands

### 1. Backend (BE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Backend (BE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git pull origin main && rm -rf frontend public src && npm install && npm run build && chown -R diurusin-apis:diurusin-apis /home/diurusin-apis/htdocs/apis.diurusin.id/ && su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && pm2 restart crm-backend"
```

**Catatan:**
- Menghapus folder sisa frontend (`frontend`, `public`, `src`) secara otomatis setiap kali pull agar server BE selalu bersih & ringan.

### 2. Frontend (FE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Frontend (FE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id && git pull origin main && rm -rf backend src public index.html tsconfig*.json && cd frontend && VITE_API_URL=https://apis.diurusin.id npm install && npm run build && chown -R diurusin-crm:diurusin-crm /home/diurusin-crm/htdocs/crm.diurusin.id/
```

**Catatan:**
- Menghapus folder sisa backend & root lama (`backend`, `src`, `public`, `index.html`, `tsconfig*.json`) secara otomatis agar server FE selalu rapi & bebas bentrokan build.
- Setelah build, clear Cloudflare cache: Cloudflare Dashboard → Caching → Purge Everything
