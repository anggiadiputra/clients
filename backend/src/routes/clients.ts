import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma';
import { validateWhatsappNumber } from '../lib/fonnte';

const router = Router();

const integrationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Terlalu banyak percobaan validasi WhatsApp. Coba lagi nanti.' },
});

const clientsResponse = (clients: any[]) =>
  clients.map((c) => ({
    ...c,
    _count: undefined,
    noteCount: (c as any)._count?.notes ?? 0,
  }));

// GET /api/clients
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    let statusList: string[] = [];
    if (Array.isArray(status)) {
      statusList = status.flatMap((s) => (typeof s === 'string' ? s.split(',') : []));
    } else if (typeof status === 'string' && status) {
      statusList = status.split(',');
    }
    const VALID_STATUSES = ['CALON_CLIENT', 'FOLLOW_UP', 'DEAL', 'KERJAKAN', 'MASA_GARANSI', 'SELESAI'];
    statusList = statusList.map((s) => s.trim()).filter((s) => VALID_STATUSES.includes(s));

    const where: any = {};
    if (search && typeof search === 'string') {
      where.name = { contains: search };
    }
    if (statusList.length === 1) {
      where.status = statusList[0];
    } else if (statusList.length > 1) {
      where.status = { in: statusList };
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { notes: true } },
      },
    });

    res.json(clientsResponse(clients));
  } catch (error: any) {
    console.error('Error in GET /api/clients:', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch clients' });
  }
});

// GET /api/clients/display/:displayId
router.get('/display/:displayId', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { displayId: req.params.displayId as string },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id as string) },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /api/clients
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, whatsapp, website, address, status } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    let isWhatsappValid: boolean | null = null;
    if (whatsapp) {
      const tokenSetting = await prisma.setting.findUnique({ where: { key: 'fonnteToken' } });
      if (tokenSetting?.value) {
        isWhatsappValid = await validateWhatsappNumber(whatsapp, tokenSetting.value);
      }
    }

    // RC #5 fix: Retry jika displayId collision
    let client;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        client = await prisma.client.create({
          data: {
            displayId: await generateDisplayIdCandidate(),
            name,
            email: email || null,
            whatsapp: whatsapp || null,
            isWhatsappValid,
            website: website || null,
            address: address || null,
            status: status || 'CALON_CLIENT',
            activities: {
              create: { action: 'Client dibuat' },
            },
          },
          include: {
            notes: { orderBy: { createdAt: 'desc' } },
            activities: { orderBy: { createdAt: 'desc' } },
          },
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002' && attempt < 4) continue;
        throw err;
      }
    }

    res.status(201).json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, email, whatsapp, website, address, status } = req.body;

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const activities: any[] = [];
    if (status && status !== existing.status) {
      activities.push({
        action: `Status berubah: ${statusLabel(existing.status)} → ${statusLabel(status)}`,
      });
    }

    let isWhatsappValid = existing.isWhatsappValid;
    if (whatsapp !== undefined && whatsapp !== existing.whatsapp) {
      if (whatsapp) {
        const tokenSetting = await prisma.setting.findUnique({ where: { key: 'fonnteToken' } });
        if (tokenSetting?.value) {
          isWhatsappValid = await validateWhatsappNumber(whatsapp, tokenSetting.value);
        } else {
          isWhatsappValid = null;
        }
      } else {
        isWhatsappValid = null;
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        email: email !== undefined ? (email || null) : existing.email,
        whatsapp: whatsapp !== undefined ? (whatsapp || null) : existing.whatsapp,
        isWhatsappValid,
        website: website !== undefined ? (website || null) : existing.website,
        address: address !== undefined ? (address || null) : existing.address,
        status: status ?? existing.status,
        activities: activities.length > 0 ? { create: activities } : undefined,
      },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// POST /api/clients/:id/validate-wa
router.post('/:id/validate-wa', integrationLimiter, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    if (!client.whatsapp) {
      res.status(400).json({ error: 'Nomor WhatsApp tidak tersedia' });
      return;
    }
    const tokenSetting = await prisma.setting.findUnique({ where: { key: 'fonnteToken' } });
    if (!tokenSetting?.value) {
      res.status(400).json({ error: 'Fonnte Token belum dikonfigurasi di Settings' });
      return;
    }
    const isValid = await validateWhatsappNumber(client.whatsapp, tokenSetting.value);
    const updated = await prisma.client.update({
      where: { id },
      data: { isWhatsappValid: isValid },
    });
    res.json({ isWhatsappValid: updated.isWhatsappValid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to validate WhatsApp number' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.client.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// POST /api/clients/:id/notes
router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const note = await prisma.note.create({
      data: { content, clientId },
    });

    await prisma.activity.create({
      data: {
        clientId,
        action: 'Catatan baru ditambahkan',
      },
    });

    res.status(201).json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// DELETE /api/clients/:id/notes/:noteId
router.delete('/:id/notes/:noteId', async (req: Request, res: Response) => {
  try {
    const noteId = parseInt(req.params.noteId as string);
    await prisma.note.delete({ where: { id: noteId } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// GET /api/clients/:id/activities
router.get('/:id/activities', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);
    const activities = await prisma.activity.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET /api/clients/:id/invoices
router.get('/:id/invoices', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);
    const invoices = await prisma.invoice.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// POST /api/clients/:id/invoices
router.post('/:id/invoices', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);
    const { issueDate, dueDate, discount, tax, notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Minimal 1 item diperlukan' });
      return;
    }

    let subtotal = 0;
    const invoiceItems = items.map((item: any) => {
      const amount = (item.quantity || 1) * (item.unitPrice || 0);
      subtotal += amount;
      return {
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        amount,
      };
    });

    const discountPct = discount || 0;
    const discountAmount = subtotal * (discountPct / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxPct = tax || 0;
    const taxAmount = afterDiscount * (taxPct / 100);
    const total = afterDiscount + taxAmount;

    // RC #5 fix: Retry jika invoiceNumber collision
    let invoice;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: generateInvoiceNumberCandidate(),
            clientId,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            dueDate: new Date(dueDate),
            subtotal,
            discount: discountPct,
            discountAmount,
            tax: taxPct,
            taxAmount,
            total,
            notes: notes || null,
            status: 'UNPAID',
            items: { create: invoiceItems },
          },
          include: { items: true },
        });
        break;
      } catch (err: any) {
        if (err.code === 'P2002' && attempt < 4) continue;
        throw err;
      }
    }

    await prisma.activity.create({
      data: { clientId, action: `Invoice ${invoice!.invoiceNumber} dibuat` },
    });

    res.status(201).json(invoice);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    CALON_CLIENT: 'Calon Client',
    FOLLOW_UP: 'Follow Up',
    DEAL: 'Deal',
    KERJAKAN: 'Kerjakan',
    MASA_GARANSI: 'Masa Garansi',
    SELESAI: 'Selesai',
  };
  return map[status] || status;
}

// RC #5 fix: Generate candidate only (no check-then-act)
function generateDisplayIdCandidate(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CL-${id}`;
}

// RC #5 fix: Generate candidate only (no check-then-act)
function generateInvoiceNumberCandidate(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${datePart}-${random}`;
}

export default router;
