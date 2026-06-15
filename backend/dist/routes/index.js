"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const bookings_1 = __importDefault(require("./bookings"));
const availability_1 = __importDefault(require("./availability"));
const admin_1 = __importDefault(require("./admin"));
const router = (0, express_1.Router)();
// Health check
router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Auth routes — /api/v1/auth/*
router.use('/auth', auth_1.default);
// Booking routes — /api/v1/bookings/*
router.use('/bookings', bookings_1.default);
// Availability routes — /api/v1/availability/*
router.use('/availability', availability_1.default);
// Admin routes — /api/v1/admin/*
router.use('/admin', admin_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map