"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const exceljs_1 = __importDefault(require("exceljs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
exports.reportsRouter = (0, express_1.Router)();
exports.reportsRouter.get('/export', (0, auth_1.requireAuth)(['ADMIN', 'PRINCIPAL', 'HTPO', 'CTPO']), async (req, res) => {
    const { year, branch } = req.query;
    const db = (0, db_1.readDb)();
    const workbook = new exceljs_1.default.Workbook();
    const sheet = workbook.addWorksheet('KICS Points');
    sheet.columns = [
        { header: 'PLG', key: 'plg', width: 20 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Branch', key: 'branch', width: 10 },
        { header: 'Member', key: 'member', width: 25 },
        { header: 'Activity', key: 'activity', width: 25 },
        { header: 'Points', key: 'points', width: 10 },
        { header: 'When', key: 'when', width: 20 },
    ];
    const plgs = db.plgs.filter((p) => (year ? p.year === year : true) && (branch ? p.branch === branch : true));
    for (const plg of plgs) {
        const activities = db.activities.filter((a) => a.plgId === plg.id);
        for (const a of activities) {
            const memberName = a.memberId ? plg.members.find((m) => m.id === a.memberId)?.name ?? '-' : '-';
            sheet.addRow({
                plg: plg.name,
                year: plg.year,
                branch: plg.branch,
                member: memberName,
                activity: a.type,
                points: a.points,
                when: new Date(a.timestamp).toLocaleString(),
            });
        }
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="KICS_Points_Export.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
});
