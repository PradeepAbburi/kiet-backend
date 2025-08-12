import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { readDb, writeDb } from '../db';
import { Branch, PLGGroup, PLGMember, Role, User, Year } from '../types';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth';

export const orgRouter = Router();

const yearEnum = z.enum(['Y1', 'Y2', 'Y3', 'Y4']);
const branchEnum = z.enum(['CSM', 'CAI', 'CSD', 'AID', 'CSC']);

// Create PLG group (CTPO/ADMIN)
orgRouter.post(
  '/plg',
  requireAuth(['CTPO', 'ADMIN'] as Role[]),
  (req: Request, res: Response) => {
    const schema = z.object({ name: z.string(), year: yearEnum, branch: branchEnum, members: z.array(z.object({ name: z.string(), email: z.string().email() })).max(5) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
    const db = readDb();
    const { name, year, branch, members } = parsed.data;
    const plg: PLGGroup = { id: uuid(), name, year: year as Year, branch: branch as Branch, members: members.map((m) => ({ id: uuid(), ...m })) as PLGMember[] };
    db.plgs.push(plg);
    writeDb(db);
    res.json(plg);
  }
);

// List PLGs with filters
orgRouter.get('/plg', requireAuth(), (req: Request, res: Response) => {
  const { year, branch } = req.query as { year?: Year; branch?: Branch };
  const db = readDb();
  let list = db.plgs;
  if (year) list = list.filter((p) => p.year === year);
  if (branch) list = list.filter((p) => p.branch === branch);
  res.json(list);
});

// Add student to PLG (CTPO)
orgRouter.post(
  '/plg/:plgId/members',
  requireAuth(['CTPO', 'ADMIN'] as Role[]),
  (req: Request, res: Response) => {
    const schema = z.object({ name: z.string(), email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
    const db = readDb();
    const plg = db.plgs.find((p) => p.id === req.params.plgId);
    if (!plg) return res.status(404).json({ error: 'PLG not found' });
    if (plg.members.length >= 5) return res.status(400).json({ error: 'PLG already has 5 members' });
    const member: PLGMember = { id: uuid(), ...parsed.data };
    plg.members.push(member);
    writeDb(db);
    res.json(member);
  }
);


