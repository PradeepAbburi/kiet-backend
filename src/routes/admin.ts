import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { readDb, writeDb } from '../db';
import { Branch, Role, User, Year } from '../types';
import { requireAuth } from '../middleware/auth';

export const adminRouter = Router();

// List users
adminRouter.get('/users', requireAuth(['ADMIN']), (_req: Request, res: Response) => {
  const db = readDb();
  res.json(db.users);
});

// Update user role and scope (year/branch)
adminRouter.patch(
  '/users/:id',
  requireAuth(['ADMIN']),
  (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().optional(),
      role: z.enum(['ADMIN', 'PRINCIPAL', 'HTPO', 'CTPO', 'PLG_MEMBER']).optional(),
      year: z.enum(['Y1', 'Y2', 'Y3', 'Y4']).optional(),
      branch: z.enum(['CSM', 'CAI', 'CSD', 'AID', 'CSC']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
    const db = readDb();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { name, role, year, branch } = parsed.data;

    const targetRole = (role ?? user.role) as Role;
    const targetYear = (year ?? user.year) as Year | undefined;
    const targetBranch = (branch ?? user.branch) as Branch | undefined;

    // Enforce org constraints:
    // - CTPO: max 2 per (year, branch), and must have year+branch
    // - HTPO: max 1 per branch, and must have branch
    if (targetRole === 'CTPO') {
      if (!targetYear || !targetBranch) {
        return res.status(400).json({ error: 'CTPO must have both year and branch' });
      }
      const numCtpo = db.users.filter(
        (u) => u.id !== user.id && u.role === 'CTPO' && u.year === targetYear && u.branch === targetBranch
      ).length;
      if (numCtpo >= 2) {
        return res.status(409).json({ error: `There are already 2 CTPOs for ${targetYear}-${targetBranch}` });
      }
    }
    if (targetRole === 'HTPO') {
      if (!targetBranch) {
        return res.status(400).json({ error: 'HTPO must have branch' });
      }
      const numHtpo = db.users.filter(
        (u) => u.id !== user.id && u.role === 'HTPO' && u.branch === targetBranch
      ).length;
      if (numHtpo >= 1) {
        return res.status(409).json({ error: `There is already an HTPO for branch ${targetBranch}` });
      }
    }

    if (name) user.name = name;
    user.role = targetRole;
    user.year = targetYear;
    user.branch = targetBranch;
    writeDb(db);
    res.json(user);
  }
);

// Reset current year scores (clear activities)
adminRouter.post('/reset-year', requireAuth(['ADMIN']), (req: Request, res: Response) => {
  const db = readDb();
  db.activities = [];
  writeDb(db);
  res.json({ ok: true });
});

// Archive year label and optionally clear PLGs too
adminRouter.post('/archive-year', requireAuth(['ADMIN']), (req: Request, res: Response) => {
  const schema = z.object({ label: z.string(), clearPlgs: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { label, clearPlgs } = parsed.data;
  const db = readDb();
  if (!db.archivedYears.includes(label)) db.archivedYears.push(label);
  db.activities = [];
  if (clearPlgs) db.plgs = [];
  writeDb(db);
  res.json({ ok: true });
});


