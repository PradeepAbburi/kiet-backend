"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./routes/auth");
const org_1 = require("./routes/org");
const points_1 = require("./routes/points");
const admin_1 = require("./routes/admin");
const reports_1 = require("./routes/reports");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
app.use('/api/auth', auth_1.authRouter);
app.use('/api/org', org_1.orgRouter);
app.use('/api/points', points_1.pointsRouter);
app.use('/api/reports', reports_1.reportsRouter);
app.use('/api/admin', admin_1.adminRouter);
// Error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API listening on :${PORT}`);
});
