"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const points_1 = require("../utils/points");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
exports.pointsRouter = (0, express_1.Router)();
const activityTypeEnum = zod_1.z.enum([
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
exports.pointsRouter.post('/', (0, auth_1.requireAuth)(['CTPO', 'HTPO', 'ADMIN']), (req, res) => {
    const schema = zod_1.z.object({ plgId: zod_1.z.string(), memberId: zod_1.z.string().optional(), type: activityTypeEnum, points: zod_1.z.number().int().positive().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const { plgId, memberId, type } = parsed.data;
    const points = parsed.data.points ?? points_1.ActivityPoints[type];
    const db = (0, db_1.readDb)();
    const plg = db.plgs.find((p) => p.id === plgId);
    if (!plg)
        return res.status(404).json({ error: 'PLG not found' });
    if (memberId && !plg.members.some((m) => m.id === memberId))
        return res.status(404).json({ error: 'Member not found' });
    // Enforce caps
    const memberTotal = memberId
        ? db.activities.filter((a) => a.memberId === memberId).reduce((s, a) => s + a.points, 0)
        : 0;
    if (memberId && memberTotal + points > points_1.MAX_POINTS_PER_MEMBER) {
        return res.status(400).json({ error: 'Member exceeds max points' });
    }
    const plgTotal = db.activities.filter((a) => a.plgId === plgId).reduce((s, a) => s + a.points, 0);
    if (plgTotal + points > points_1.MAX_POINTS_PER_PLG) {
        return res.status(400).json({ error: 'PLG exceeds max points' });
    }
    const entry = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        plgId,
        memberId,
        type,
        points,
        createdByUserId: req.user.userId,
    };
    db.activities.push(entry);
    (0, db_1.writeDb)(db);
    res.json(entry);
});
// Leaderboards
exports.pointsRouter.get('/leaderboard/plg', (0, auth_1.requireAuth)(), (req, res) => {
    const { year, branch } = req.query;
    const db = (0, db_1.readDb)();
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
exports.pointsRouter.get('/leaderboard/ctpo', (0, auth_1.requireAuth)(), (_req, res) => {
    const db = (0, db_1.readDb)();
    // assume CTPO users have year+branch set; aggregate by (year, branch)
    const ctpoBuckets = new Map();
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
exports.pointsRouter.get('/leaderboard/htpo', (0, auth_1.requireAuth)(), (_req, res) => {
    const db = (0, db_1.readDb)();
    const htpoBuckets = new Map();
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
