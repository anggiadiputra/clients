import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma';
import { generateInvoicePDF } from '../lib/pdf';

const router = Router();

const pdfLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Terlalu banyak permintaan PDF. Coba lagi dalam beberapa saat.' },
});

// GET /api/invoices/number/:invoiceNumber
router.get('/number/:invoiceNumber', async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: req.params.invoiceNumber as string },
      include: { items: true, client: true },
    });
    if (!invoice) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// GET /api/invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, client: { select: { id: true, displayId: true, name: true } } },
    });
    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id as string) },
      include: { items: true, client: true },
    });
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// PUT /api/invoices/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { dueDate, tax, notes, items } = req.body;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // When items are provided, recompute from them; otherwise keep existing subtotal/total.
    const itemsProvided = items && Array.isArray(items) && items.length > 0;
    let subtotal = existing.subtotal;
    let invoiceItems: any[] = [];

    if (itemsProvided) {
      subtotal = 0;
      invoiceItems = items.map((item: any) => {
        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || 0;
        const amount = quantity * unitPrice;
        subtotal += amount;
        return {
          description: item.description,
          quantity,
          unitPrice,
          amount,
        };
      });
    }

    const taxPct = tax !== undefined ? tax : existing.tax;
    const taxAmount = +(subtotal * (taxPct / 100)).toFixed(2);
    const total = +(subtotal + taxAmount).toFixed(2);

    // RC #6 fix + BE-6: Wrap delete + create dalam $transaction; preserve totals when items omitted.
    const invoice = await prisma.$transaction(async (tx: any) => {
      if (itemsProvided) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
          subtotal: itemsProvided ? subtotal : existing.subtotal,
          tax: taxPct,
          taxAmount: itemsProvided ? taxAmount : existing.taxAmount,
          total: itemsProvided ? total : existing.total,
          notes: notes !== undefined ? notes : existing.notes,
          items: itemsProvided ? { create: invoiceItems } : undefined,
        },
        include: { items: true },
      });
    });


    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});


// PUT /api/invoices/:id/status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;

    if (!['UNPAID', 'PAID', 'CANCELLED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status },
      include: { items: true, client: true },
    });

    const statusLabels: Record<string, string> = {
      PAID: 'dibayar',
      CANCELLED: 'dibatalkan',
      UNPAID: 'belum dibayar',
    };

    await prisma.activity.create({
      data: {
        clientId: invoice.clientId,
        action: `Invoice ${invoice.invoiceNumber} ${statusLabels[status] || status}`,
      },
    });

    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.invoice.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', pdfLimiter, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, client: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Fetch sender settings
    const senderRows = await prisma.setting.findMany({
      where: { key: { in: ['senderName', 'senderAddress', 'senderPhone', 'senderEmail', 'projectName', 'logo', 'bankAccounts', 'termsAndConditions'] } },
    });
    const sender: any = {};
    senderRows.forEach((r: any) => { sender[r.key] = r.value; });


    const doc = generateInvoicePDF(invoice, invoice.client, sender);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
