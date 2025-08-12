import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { authRouter } from './routes/auth';
import { orgRouter } from './routes/org';
import { pointsRouter } from './routes/points';
import { adminRouter } from './routes/admin';
import { reportsRouter } from './routes/reports';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/org', orgRouter);
app.use('/api/points', pointsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});


