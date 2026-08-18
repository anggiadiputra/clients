import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma';
import * as XLSX from 'xlsx';

const router = Router();

function sanitizeFormula(value: any): any {
  if (typeof value === 'string' && value.length > 0) {
    const firstChar = value.charAt(0);
    if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
      return `'${value}`;
    }
  }
  return value;
}

// GET /api/export?format=xlsx
router.get('/', async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { notes: true },
    });

    const data = clients.map((c: any) => ({
      'Nama Usaha': sanitizeFormula(c.name),
      Email: sanitizeFormula(c.email || '-'),
      WhatsApp: sanitizeFormula(c.whatsapp || '-'),
      Website: sanitizeFormula(c.website || '-'),
      Alamat: sanitizeFormula(c.address || '-'),
      Status: sanitizeFormula(statusLabel(c.status)),
      'Jumlah Catatan': c.notes.length,
      'Dibuat': c.createdAt.toISOString(),
      'Diupdate': c.updatedAt.toISOString(),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buf);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export' });
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

export default router;
