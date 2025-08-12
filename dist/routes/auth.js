"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.authRouter = (0, express_1.Router)();
const emailSchema = zod_1.z.string().email();
// Simplified OTP store (in-memory). In production, use Redis or provider API
const otpStore = new Map();
exports.authRouter.post('/request-otp', (req, res) => {
    const parsed = emailSchema.safeParse(req.body.email);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid email' });
    const email = parsed.data.toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, { code, expiresAt });
    // For now, return the code in response (replace with email provider integration)
    return res.json({ ok: true, code });
});
exports.authRouter.post('/verify-otp', (req, res) => {
    const schema = zod_1.z.object({ email: zod_1.z.string().email(), code: zod_1.z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { email, code } = parsed.data;
    const record = otpStore.get(email.toLowerCase());
    if (!record || record.expiresAt < Date.now() || record.code !== code) {
        return res.status(400).json({ error: 'Invalid or expired code' });
    }
    const db = (0, db_1.readDb)();
    let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        // By default, new users are PLG_MEMBER and must be escalated by admin
        user = { id: (0, uuid_1.v4)(), email, name: email.split('@')[0], role: 'PLG_MEMBER' };
        db.users.push(user);
        (0, db_1.writeDb)(db);
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', {
        expiresIn: '7d',
    });
    return res.json({ token, user });
});
// Admin bootstrap endpoint to create users with roles/passwords (optional)
exports.authRouter.post('/bootstrap-admin', (req, res) => {
    const schema = zod_1.z.object({ email: zod_1.z.string().email(), name: zod_1.z.string(), role: zod_1.z.enum(['ADMIN', 'PRINCIPAL', 'HTPO', 'CTPO', 'PLG_MEMBER']), password: zod_1.z.string().min(6) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { email, name, role, password } = parsed.data;
    const db = (0, db_1.readDb)();
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(409).json({ error: 'User already exists' });
    }
    const passwordHash = bcryptjs_1.default.hashSync(password, 10);
    const user = { id: (0, uuid_1.v4)(), email, name, role: role, passwordHash };
    db.users.push(user);
    (0, db_1.writeDb)(db);
    res.json({ ok: true, user });
});
exports.authRouter.post('/login', (req, res) => {
    const schema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { email, password } = parsed.data;
    const db = (0, db_1.readDb)();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !user.passwordHash || !bcryptjs_1.default.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    res.json({ token, user });
});
