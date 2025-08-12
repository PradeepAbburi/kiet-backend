"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireAuth(allowedRoles) {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = header.slice('Bearer '.length);
        try {
            const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'dev-secret');
            if (allowedRoles && !allowedRoles.includes(payload.role)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            req.user = payload;
            next();
        }
        catch (_e) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    };
}
