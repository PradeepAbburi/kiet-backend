import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { readDb, writeDb } from '../db';
import { Role, User } from '../types';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

export const authRouter = Router();

const emailSchema = z.string().email();

// Simplified OTP store (in-memory). In production, use Redis or provider API
const otpStore = new Map<string, { code: string; expiresAt: number }>();

authRouter.post('/request-otp', (req: Request, res: Response) => {
  const parsed = emailSchema.safeParse(req.body.email);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email' });
  const email = parsed.data.toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email, { code, expiresAt });
  // For now, return the code in response (replace with email provider integration)
  return res.json({ ok: true, code });
});

authRouter.post('/verify-otp', (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email(), code: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, code } = parsed.data;
  const record = otpStore.get(email.toLowerCase());
  if (!record || record.expiresAt < Date.now() || record.code !== code) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  const db = readDb();
  let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // By default, new users are PLG_MEMBER and must be escalated by admin
    user = { id: uuid(), email, name: email.split('@')[0], role: 'PLG_MEMBER' } satisfies User;
    db.users.push(user);
    writeDb(db);
  }
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  });
  return res.json({ token, user });
});

// Admin bootstrap endpoint to create users with roles/passwords (optional)
authRouter.post('/bootstrap-admin', (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email(), name: z.string(), role: z.enum(['ADMIN', 'PRINCIPAL', 'HTPO', 'CTPO', 'PLG_MEMBER']), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, name, role, password } = parsed.data;
  const db = readDb();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const user: User = { id: uuid(), email, name, role: role as Role, passwordHash };
  db.users.push(user);
  writeDb(db);
  res.json({ ok: true, user });
});

authRouter.post('/login', (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email(), password: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, password } = parsed.data;
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
  res.json({ token, user });
});


