import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { uploadBuffer, deleteObject, makeStorageKey } from '../lib/s3';

const router = Router();

const ALLOWED_STATUS = ['MULAI', 'PENGERJAAN', 'REVIEW', 'REVISI', 'SELESAI'] as const;
const ALLOWED_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/plain',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

const projectInclude = {
  client: { select: { id: true, displayId: true, name: true } },
  assignee: { select: { id: true, name: true, email: true } },
  _count: { select: { comments: true, attachments: true } },
};

function asString(v: unknown): string {
  return Array.isArray(v) ? v[0] ?? '' : v == null ? '' : String(v);
}

function parseIntSafe(v: unknown): number | null {
  const s = asString(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function parseDateOrNull(s: any): Date | null | undefined {
  if (s === undefined) return undefined;
  if (s === null || s === '') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Accepts number, numeric string, or null/undefined. Returns Prisma Decimal-compatible value or undefined. */
function parseDecimalOrUndef(v: unknown): number | string | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null as any; // explicit null clears the field
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d.-]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// GET /api/projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, clientId, assigneeId, priority, q } = req.query;
    const where: any = {};
    if (status && typeof status === 'string') where.status = status;
    if (clientId) {
      const n = parseIntSafe(clientId);
      if (n !== null) where.clientId = n;
    }
    // STAFF can only see projects assigned to them. Admin can filter freely.
    if (req.authUser?.role === 'STAFF') {
      where.assigneeId = req.authUser.id;
    } else if (assigneeId) {
      const n = parseIntSafe(assigneeId);
      if (n !== null) where.assigneeId = n;
    }
    if (priority && typeof priority === 'string') where.priority = priority;
    if (q && typeof q === 'string' && q.trim()) {
      where.OR = [
        { title: { contains: q.trim() } },
        { description: { contains: q.trim() } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: projectInclude,
    });

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseIntSafe(req.params.id); if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        ...projectInclude,
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: { uploadedBy: { select: { id: true, name: true, email: true } } },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    // Staff can only fetch projects assigned to them
    if (req.authUser?.role === 'STAFF' && project.assigneeId !== req.authUser.id) {
      res.status(403).json({ error: 'Forbidden: project bukan milik Anda' });
      return;
    }
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, status, priority, dueDate, clientId, assigneeId, value, commission } = req.body;
    if (!title || !clientId) { res.status(400).json({ error: 'title dan clientId wajib diisi' }); return; }
    const cid = parseIntSafe(clientId);
    if (cid === null) { res.status(400).json({ error: 'clientId tidak valid' }); return; }

    const client = await prisma.client.findUnique({ where: { id: cid } });
    if (!client) { res.status(400).json({ error: 'Client tidak ditemukan' }); return; }

    const projStatus = status && (ALLOWED_STATUS as readonly string[]).includes(status) ? status : 'MULAI';
    const projPriority = priority && (ALLOWED_PRIORITY as readonly string[]).includes(priority) ? priority : 'MEDIUM';

    const data: any = {
      title: String(title).trim(),
      description: description ? String(description) : null,
      status: projStatus as any,
      priority: projPriority as any,
      dueDate: parseDateOrNull(dueDate) ?? null,
      clientId: cid,
      assigneeId: assigneeId != null ? parseIntSafe(assigneeId) : null,
    };
    const v = parseDecimalOrUndef(value);
    if (v !== undefined) data.value = v as any;
    const c = parseDecimalOrUndef(commission);
    if (c !== undefined) data.commission = c as any;

    const project = await prisma.project.create({
      data: {
        ...data,
        activities: {
          create: {
            userId: req.authUser!.id,
            kind: 'CREATE',
            toValue: 'MULAI',
          },
        },
      },
      include: projectInclude,
    });

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PATCH /api/projects/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseIntSafe(req.params.id); if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Project not found' }); return; }

    // Staff may only change status (drag-and-drop). Any other field is forbidden.
    const isStaff = req.authUser?.role === 'STAFF';
    if (isStaff) {
      const allowedKeys = new Set(['status']);
      const requestedKeys = Object.keys(req.body).filter((k) => req.body[k] !== undefined);
      const extras = requestedKeys.filter((k) => !allowedKeys.has(k));
      if (extras.length > 0) {
        res.status(403).json({ error: 'Forbidden: staf hanya boleh mengubah status proyek' });
        return;
      }
      // Staff can only move their own projects
      if (existing.assigneeId !== req.authUser!.id) {
        res.status(403).json({ error: 'Forbidden: proyek bukan milik Anda' });
        return;
      }
    }

    const { title, description, status, priority, dueDate, assigneeId, value, commission } = req.body;
    const data: any = {};
    const activities: any[] = [];

    if (title !== undefined) data.title = String(title).trim();
    if (description !== undefined) data.description = description === null || description === '' ? null : String(description);
    if (priority !== undefined) {
      if (!(ALLOWED_PRIORITY as readonly string[]).includes(priority)) { res.status(400).json({ error: 'priority tidak valid' }); return; }
      if (existing.priority !== priority) {
        activities.push({ userId: req.authUser!.id, kind: 'UPDATE', fromValue: 'priority', toValue: priority });
        data.priority = priority;
      }
    }
    if (dueDate !== undefined) {
      const nd = parseDateOrNull(dueDate);
      data.dueDate = nd;
    }
    if (status !== undefined) {
      if (!(ALLOWED_STATUS as readonly string[]).includes(status)) { res.status(400).json({ error: 'status tidak valid' }); return; }
      if (existing.status !== status) {
        activities.push({ userId: req.authUser!.id, kind: 'STATUS_CHANGE', fromValue: existing.status, toValue: status });
        data.status = status;
      }
    }
    if (assigneeId !== undefined) {
      const newAssignee = assigneeId === null || assigneeId === '' ? null : parseIntSafe(assigneeId);
      if (existing.assigneeId !== newAssignee) {
        activities.push({ userId: req.authUser!.id, kind: 'ASSIGNEE_CHANGE', fromValue: existing.assigneeId ? String(existing.assigneeId) : null, toValue: newAssignee ? String(newAssignee) : null });
        data.assigneeId = newAssignee;
      }
    }
    if (value !== undefined) {
      const v = parseDecimalOrUndef(value);
      if (v !== undefined) data.value = v as any;
    }
    if (commission !== undefined) {
      const c = parseDecimalOrUndef(commission);
      if (c !== undefined) data.commission = c as any;
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        ...(activities.length ? { activities: { create: activities } } : {}),
      },
      include: projectInclude,
    });

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseIntSafe(req.params.id); if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    // Best-effort cleanup of S3 attachments before cascade delete
    const attachments = await prisma.projectAttachment.findMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });
    for (const a of attachments) {
      try { await deleteObject(a.storageKey); } catch (e) { console.error('S3 delete failed:', e); }
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/projects/:id/comments
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const id = parseIntSafe(req.params.id); if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    const { body } = req.body;
    if (!body || !String(body).trim()) { res.status(400).json({ error: 'body wajib diisi' }); return; }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

    const comment = await prisma.projectComment.create({
      data: {
        projectId: id,
        userId: req.authUser!.id,
        body: String(body).trim(),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await prisma.projectActivity.create({
      data: { projectId: id, userId: req.authUser!.id, kind: 'COMMENT' },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/projects/:id/comments/:commentId
router.delete('/:id/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const commentId = parseIntSafe(req.params.commentId); if (commentId === null) { res.status(400).json({ error: "Invalid commentId" }); return; }
    if (isNaN(commentId)) { res.status(400).json({ error: 'Invalid commentId' }); return; }
    await prisma.projectComment.delete({ where: { id: commentId } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /api/projects/:id/attachments (multipart)
router.post('/:id/attachments', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const id = parseIntSafe(req.params.id); if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
    if (!req.file) { res.status(400).json({ error: 'File wajib diupload' }); return; }
    if (!ALLOWED_MIME.has(req.file.mimetype)) {
      res.status(400).json({ error: `Tipe file ${req.file.mimetype} tidak diizinkan` });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

    const key = makeStorageKey(id, req.file.originalname);
    let url: string;
    try {
      url = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
    } catch (e: any) {
      console.error('S3 upload error:', e);
      res.status(500).json({ error: `Upload S3 gagal: ${e?.message || 'unknown'}` });
      return;
    }

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId: id,
        filename: req.file.originalname,
        storageKey: key,
        contentType: req.file.mimetype,
        size: req.file.size,
        uploadedById: req.authUser!.id,
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });

    await prisma.projectActivity.create({
      data: { projectId: id, userId: req.authUser!.id, kind: 'ATTACHMENT', toValue: req.file.originalname },
    });

    res.status(201).json({ ...attachment, url });
  } catch (error: any) {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File terlalu besar (maks 10MB)' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// DELETE /api/projects/:id/attachments/:attId
router.delete('/:id/attachments/:attId', async (req: Request, res: Response) => {
  try {
    const attId = parseIntSafe(req.params.attId); if (attId === null) { res.status(400).json({ error: "Invalid attId" }); return; }
    if (isNaN(attId)) { res.status(400).json({ error: 'Invalid attId' }); return; }
    const att = await prisma.projectAttachment.findUnique({ where: { id: attId } });
    if (!att) { res.status(404).json({ error: 'Attachment not found' }); return; }
    await prisma.projectAttachment.delete({ where: { id: attId } });
    try { await deleteObject(att.storageKey); } catch (e) { console.error('S3 delete failed:', e); }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// GET /api/projects/by-client/:clientId
router.get('/by-client/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseIntSafe(req.params.clientId);
    if (clientId === null) { res.status(400).json({ error: 'Invalid clientId' }); return; }
    const projects = await prisma.project.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
      include: projectInclude,
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client projects' });
  }
});

export default router;
