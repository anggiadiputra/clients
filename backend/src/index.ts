import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import clientsRouter from './routes/clients';
import invoicesRouter from './routes/invoices';
import settingsRouter from './routes/settings';
import servicesRouter from './routes/services';
import exportRouter from './routes/export';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import accessRouter from './routes/access';
import projectsRouter from './routes/projects';
import setupRouter from './routes/setup';
import { requireAuth } from './middleware/auth';
import { requirePageAccess } from './lib/rbac';
import prisma from './lib/prisma';
import { ALLOWED_ORIGINS } from './lib/config';

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow cross-origin assets (e.g. S3 uploads)
}));

// Trust 1 reverse proxy (e.g. Nginx/Cloudflare) in front of the Node app
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no origin header, e.g. server-to-server or mobile apps)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS origin policy'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/setup', setupRouter);

// Public branding settings — no auth required (login page & shared shell)
app.get('/api/settings/public', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache');
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['projectName', 'logo', 'primaryColor', 'pageBackground', 'turnstileSiteKey', 'turnstileEnabled'] } },
    });
    const defs: Record<string, string> = {
      projectName: 'Client CRM',
      logo: '',
      primaryColor: 'black',
      pageBackground: '#f0f2f5',
      turnstileEnabled: 'true',
      turnstileSiteKey: '',
    };
    rows.forEach((r: any) => { defs[r.key] = r.value; });
    res.json(defs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Protected routes — each section requires its own page-access row
app.get('/api/settings/branding', requireAuth, async (_req, res) => {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['projectName', 'logo', 'primaryColor', 'pageBackground'] } },
    });
    const defs: Record<string, string> = { projectName: 'Client CRM', logo: '', primaryColor: 'black', pageBackground: '#f0f2f5' };
    rows.forEach((r: any) => { defs[r.key] = r.value; });
    res.json(defs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch branding' });
  }
});
app.use('/api/clients', requireAuth, requirePageAccess('clients'), clientsRouter);
app.use('/api/invoices', requireAuth, requirePageAccess('invoices'), invoicesRouter);
app.use('/api/services', requireAuth, requirePageAccess('services'), servicesRouter);
// Public-for-auth: PIC options used by project assignment dropdowns.
app.get('/api/users/pic-options', requireAuth, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'STAFF' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch PIC options' });
  }
});
app.use('/api/users', requireAuth, requirePageAccess('users'), usersRouter);
app.use('/api/access', requireAuth, accessRouter);
app.use('/api/settings', requireAuth, requirePageAccess('settings'), settingsRouter);
app.use('/api/projects', requireAuth, requirePageAccess('projects'), projectsRouter);
app.use('/api/export', requireAuth, requirePageAccess('export'), exportRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
