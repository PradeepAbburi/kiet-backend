import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { readDb, writeDb } from '../db';
import { ActivityEntry, Branch, PLGGroup, Year } from '../types';
import { ActivityPoints, MAX_POINTS_PER_MEMBER, MAX_POINTS_PER_PLG } from '../utils/points';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth';

export const pointsRouter = Router();

const activityTypeEnum = z.enum([
  'ATTENDANCE',
  'WEEKLY_MODULE',
  'CERTIFICATION',
  'PROJECT_MILESTONE',
  'HELPING_PEER',
  'HACKATHON',
  'INTERNSHIP_OFFER',
  'GITHUB_PUBLISH',
  'WIN_CHALLENGE',
  'EVENT_ATTENDED',
]);

pointsRouter.post('/', requireAuth(['CTPO', 'HTPO', 'ADMIN']), (req: Request, res: Response) => {
  const schema = z.object({ plgId: z.string(), memberId: z.string().optional(), type: activityTypeEnum, points: z.number().int().positive().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { plgId, memberId, type } = parsed.data;
  const points = parsed.data.points ?? ActivityPoints[type];
  const db = readDb();
  const plg = db.plgs.find((p) => p.id === plgId);
  if (!plg) return res.status(404).json({ error: 'PLG not found' });
  if (memberId && !plg.members.some((m) => m.id === memberId)) return res.status(404).json({ error: 'Member not found' });

  // Enforce caps
  const memberTotal = memberId
    ? db.activities.filter((a) => a.memberId === memberId).reduce((s, a) => s + a.points, 0)
    : 0;
  if (memberId && memberTotal + points > MAX_POINTS_PER_MEMBER) {
    return res.status(400).json({ error: 'Member exceeds max points' });
  }
  const plgTotal = db.activities.filter((a) => a.plgId === plgId).reduce((s, a) => s + a.points, 0);
  if (plgTotal + points > MAX_POINTS_PER_PLG) {
    return res.status(400).json({ error: 'PLG exceeds max points' });
  }

  const entry: ActivityEntry = {
    id: uuid(),
    timestamp: Date.now(),
    plgId,
    memberId,
    type,
    points,
    createdByUserId: req.user!.userId,
  };
  db.activities.push(entry);
  writeDb(db);
  res.json(entry);
});

// Leaderboards
pointsRouter.get('/leaderboard/plg', requireAuth(), (req: Request, res: Response) => {
  const { year, branch } = req.query as { year?: Year; branch?: Branch };
  const db = readDb();
  const list = db.plgs
    .filter((p) => (year ? p.year === year : true) && (branch ? p.branch === branch : true))
    .map((plg) => {
      const total = db.activities.filter((a) => a.plgId === plg.id).reduce((s, a) => s + a.points, 0);
      return { plg, total };
    })
    .sort((a, b) => b.total - a.total);
  res.json(list);
});

// CTPO = sum of PLG scores in their classes (same year+branch)
pointsRouter.get('/leaderboard/ctpo', requireAuth(), (_req: Request, res: Response) => {
  const db = readDb();
  // assume CTPO users have year+branch set; aggregate by (year, branch)
  const ctpoBuckets = new Map<string, number>();
  for (const plg of db.plgs) {
    const bucket = `${plg.year}:${plg.branch}`;
    const total = db.activities.filter((a) => a.plgId === plg.id).reduce((s, a) => s + a.points, 0);
    ctpoBuckets.set(bucket, (ctpoBuckets.get(bucket) || 0) + total);
  }
  const result = Array.from(ctpoBuckets.entries())
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total);
  res.json(result);
});

// HTPO = sum of CTPO scores in their department (branch)
pointsRouter.get('/leaderboard/htpo', requireAuth(), (_req: Request, res: Response) => {
  const db = readDb();
  const htpoBuckets = new Map<string, number>();
  for (const plg of db.plgs) {
    const bucket = `${plg.branch}`;
    const total = db.activities.filter((a) => a.plgId === plg.id).reduce((s, a) => s + a.points, 0);
    htpoBuckets.set(bucket, (htpoBuckets.get(bucket) || 0) + total);
  }
  const result = Array.from(htpoBuckets.entries())
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total);
  res.json(result);
});


