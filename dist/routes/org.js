"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
exports.orgRouter = (0, express_1.Router)();
const yearEnum = zod_1.z.enum(['Y1', 'Y2', 'Y3', 'Y4']);
const branchEnum = zod_1.z.enum(['CSM', 'CAI', 'CSD', 'AID', 'CSC']);
// Create PLG group (CTPO/ADMIN)
exports.orgRouter.post('/plg', (0, auth_1.requireAuth)(['CTPO', 'ADMIN']), (req, res) => {
    const schema = zod_1.z.object({ name: zod_1.z.string(), year: yearEnum, branch: branchEnum, members: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), email: zod_1.z.string().email() })).max(5) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const db = (0, db_1.readDb)();
    const { name, year, branch, members } = parsed.data;
    const plg = { id: (0, uuid_1.v4)(), name, year: year, branch: branch, members: members.map((m) => ({ id: (0, uuid_1.v4)(), ...m })) };
    db.plgs.push(plg);
    (0, db_1.writeDb)(db);
    res.json(plg);
});
// List PLGs with filters
exports.orgRouter.get('/plg', (0, auth_1.requireAuth)(), (req, res) => {
    const { year, branch } = req.query;
    const db = (0, db_1.readDb)();
    let list = db.plgs;
    if (year)
        list = list.filter((p) => p.year === year);
    if (branch)
        list = list.filter((p) => p.branch === branch);
    res.json(list);
});
// Add student to PLG (CTPO)
exports.orgRouter.post('/plg/:plgId/members', (0, auth_1.requireAuth)(['CTPO', 'ADMIN']), (req, res) => {
    const schema = zod_1.z.object({ name: zod_1.z.string(), email: zod_1.z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const db = (0, db_1.readDb)();
    const plg = db.plgs.find((p) => p.id === req.params.plgId);
    if (!plg)
        return res.status(404).json({ error: 'PLG not found' });
    if (plg.members.length >= 5)
        return res.status(400).json({ error: 'PLG already has 5 members' });
    const member = { id: (0, uuid_1.v4)(), ...parsed.data };
    plg.members.push(member);
    (0, db_1.writeDb)(db);
    res.json(member);
});
