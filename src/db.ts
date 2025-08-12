import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DatabaseSchema } from './types';

const DATA_DIR = join(process.cwd(), 'data');
const DATA_FILE = join(DATA_DIR, 'db.json');

const defaultDb: DatabaseSchema = {
  users: [],
  plgs: [],
  activities: [],
  archivedYears: [],
};

function ensureFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, JSON.stringify(defaultDb, null, 2));
}

export function readDb(): DatabaseSchema {
  ensureFile();
  const raw = readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as DatabaseSchema;
}

export function writeDb(data: DatabaseSchema): void {
  ensureFile();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}


