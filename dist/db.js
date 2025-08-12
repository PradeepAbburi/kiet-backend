"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readDb = readDb;
exports.writeDb = writeDb;
const fs_1 = require("fs");
const path_1 = require("path");
const DATA_DIR = (0, path_1.join)(process.cwd(), 'data');
const DATA_FILE = (0, path_1.join)(DATA_DIR, 'db.json');
const defaultDb = {
    users: [],
    plgs: [],
    activities: [],
    archivedYears: [],
};
function ensureFile() {
    if (!(0, fs_1.existsSync)(DATA_DIR))
        (0, fs_1.mkdirSync)(DATA_DIR);
    if (!(0, fs_1.existsSync)(DATA_FILE))
        (0, fs_1.writeFileSync)(DATA_FILE, JSON.stringify(defaultDb, null, 2));
}
function readDb() {
    ensureFile();
    const raw = (0, fs_1.readFileSync)(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
}
function writeDb(data) {
    ensureFile();
    (0, fs_1.writeFileSync)(DATA_FILE, JSON.stringify(data, null, 2));
}
