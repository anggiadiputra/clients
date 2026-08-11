# Project Rules

## Deployment / Git Pull Commands

### 1. Backend (BE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Backend (BE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-apis/htdocs/apis.diurusin.id && git pull origin main && npm install && npm run build && su - diurusin-apis -c "cd /home/diurusin-apis/htdocs/apis.diurusin.id && pm2 restart crm-backend"
```

### 2. Frontend (FE) Git Pull Command
Jika user menanyakan perintah git pull / deployment Frontend (FE) untuk proyek ini, berikan perintah ini:

```bash
cd /home/diurusin-crm/htdocs/crm.diurusin.id && git pull origin main && echo "VITE_API_URL=https://apis.diurusin.id" > .env && npm install && npm run build
```
