"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
exports.adminRouter = (0, express_1.Router)();
// List users
exports.adminRouter.get('/users', (0, auth_1.requireAuth)(['ADMIN']), (_req, res) => {
    const db = (0, db_1.readDb)();
    res.json(db.users);
});
// Update user role and scope (year/branch)
exports.adminRouter.patch('/users/:id', (0, auth_1.requireAuth)(['ADMIN']), (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().optional(),
        role: zod_1.z.enum(['ADMIN', 'PRINCIPAL', 'HTPO', 'CTPO', 'PLG_MEMBER']).optional(),
        year: zod_1.z.enum(['Y1', 'Y2', 'Y3', 'Y4']).optional(),
        branch: zod_1.z.enum(['CSM', 'CAI', 'CSD', 'AID', 'CSC']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const db = (0, db_1.readDb)();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const { name, role, year, branch } = parsed.data;
    const targetRole = (role ?? user.role);
    const targetYear = (year ?? user.year);
    const targetBranch = (branch ?? user.branch);
    // Enforce org constraints:
    // - CTPO: max 2 per (year, branch), and must have year+branch
    // - HTPO: max 1 per branch, and must have branch
    if (targetRole === 'CTPO') {
        if (!targetYear || !targetBranch) {
            return res.status(400).json({ error: 'CTPO must have both year and branch' });
        }
        const numCtpo = db.users.filter((u) => u.id !== user.id && u.role === 'CTPO' && u.year === targetYear && u.branch === targetBranch).length;
        if (numCtpo >= 2) {
            return res.status(409).json({ error: `There are already 2 CTPOs for ${targetYear}-${targetBranch}` });
        }
    }
    if (targetRole === 'HTPO') {
        if (!targetBranch) {
            return res.status(400).json({ error: 'HTPO must have branch' });
        }
        const numHtpo = db.users.filter((u) => u.id !== user.id && u.role === 'HTPO' && u.branch === targetBranch).length;
        if (numHtpo >= 1) {
            return res.status(409).json({ error: `There is already an HTPO for branch ${targetBranch}` });
        }
    }
    if (name)
        user.name = name;
    user.role = targetRole;
    user.year = targetYear;
    user.branch = targetBranch;
    (0, db_1.writeDb)(db);
    res.json(user);
});
// Reset current year scores (clear activities)
exports.adminRouter.post('/reset-year', (0, auth_1.requireAuth)(['ADMIN']), (req, res) => {
    const db = (0, db_1.readDb)();
    db.activities = [];
    (0, db_1.writeDb)(db);
    res.json({ ok: true });
});
// Archive year label and optionally clear PLGs too
exports.adminRouter.post('/archive-year', (0, auth_1.requireAuth)(['ADMIN']), (req, res) => {
    const schema = zod_1.z.object({ label: zod_1.z.string(), clearPlgs: zod_1.z.boolean().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { label, clearPlgs } = parsed.data;
    const db = (0, db_1.readDb)();
    if (!db.archivedYears.includes(label))
        db.archivedYears.push(label);
    db.activities = [];
    if (clearPlgs)
        db.plgs = [];
    (0, db_1.writeDb)(db);
    res.json({ ok: true });
});
