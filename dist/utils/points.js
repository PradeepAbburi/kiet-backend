"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_POINTS_PER_PLG = exports.MEMBERS_PER_PLG = exports.MAX_POINTS_PER_MEMBER = exports.ActivityPoints = void 0;
exports.ActivityPoints = {
    ATTENDANCE: 5,
    WEEKLY_MODULE: 10,
    CERTIFICATION: 50,
    PROJECT_MILESTONE: 25,
    HELPING_PEER: 5,
    HACKATHON: 25,
    INTERNSHIP_OFFER: 100,
    GITHUB_PUBLISH: 10,
    WIN_CHALLENGE: 10,
    EVENT_ATTENDED: 10,
};
exports.MAX_POINTS_PER_MEMBER = 250;
exports.MEMBERS_PER_PLG = 5;
exports.MAX_POINTS_PER_PLG = exports.MAX_POINTS_PER_MEMBER * exports.MEMBERS_PER_PLG; // 1250
