import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/setup', setupRouter);

// Public branding settings — no auth required (login page & shared shell)
app.get('/api/settings/public', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['projectName','logo','primaryColor','pageBackground'] } },
    });
    const defs: Record<string,string> = { projectName:'Client CRM', logo:'', primaryColor:'black', pageBackground:'#f0f2f5' };
    rows.forEach((r:any) => { defs[r.key] = r.value; });
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
