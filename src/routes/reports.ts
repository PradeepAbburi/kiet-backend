import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { readDb } from '../db';
import { Branch, Year } from '../types';
import { requireAuth } from '../middleware/auth';

export const reportsRouter = Router();

reportsRouter.get('/export', requireAuth(['ADMIN', 'PRINCIPAL', 'HTPO', 'CTPO']), async (req: Request, res: Response) => {
  const { year, branch } = req.query as { year?: Year; branch?: Branch };
  const db = readDb();

  const workbook = new ExcelJS.Workbook();
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


