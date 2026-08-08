import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/services
router.get('/', async (_req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST /api/services
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, price } = req.body;
    if (!name || price === undefined) {
      res.status(400).json({ error: 'Nama dan harga wajib diisi' });
      return;
    }
    const service = await prisma.service.create({ data: { name, description: description || null, price } });
    res.status(201).json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PUT /api/services/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, description, price } = req.body;
    const service = await prisma.service.update({
      where: { id },
      data: { name, description, price },
    });
    res.json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE /api/services/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.service.delete({ where: { id: parseInt(req.params.id as string) } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

export default router;
