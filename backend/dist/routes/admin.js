"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authGuard_1 = require("../middleware/authGuard");
const adminGuard_1 = require("../middleware/adminGuard");
const bookingService = __importStar(require("../services/bookingService"));
const adminController = __importStar(require("../controllers/adminController"));
const adminValidators_1 = require("../validators/adminValidators");
const router = (0, express_1.Router)();
// All admin routes require authentication + admin role
router.use(authGuard_1.authGuard);
router.use(adminGuard_1.adminGuard);
// Desk resource management
router.post('/desks', adminValidators_1.createDeskValidation, adminController.createDesk);
router.put('/desks/:id', adminValidators_1.updateDeskValidation, adminController.updateDesk);
router.delete('/desks/:id', adminController.deleteDesk);
// Parking spot resource management
router.post('/parking', adminValidators_1.createParkingValidation, adminController.createParking);
router.put('/parking/:id', adminValidators_1.updateParkingValidation, adminController.updateParking);
router.delete('/parking/:id', adminController.deleteParking);
/**
 * GET /api/v1/admin/bookings
 * Returns admin booking overview with optional filters.
 * Query params: startDate, endDate (YYYY-MM-DD), resourceType ('desk' | 'parking_spot')
 * Defaults to today → today + 30 days when no date range specified.
 * Returns 200 with bookings list, 400 on validation error.
 */
router.get('/bookings', async (req, res, next) => {
    try {
        const { startDate, endDate, resourceType } = req.query;
        // Validate resourceType if provided
        if (resourceType && resourceType !== 'desk' && resourceType !== 'parking_spot') {
            res.status(400).json({ error: 'Invalid resourceType. Must be "desk" or "parking_spot"' });
            return;
        }
        // If one date is provided, both must be provided
        if ((startDate && !endDate) || (!startDate && endDate)) {
            res.status(400).json({ error: 'Both startDate and endDate must be provided together' });
            return;
        }
        const filters = {
            startDate: startDate,
            endDate: endDate,
            resourceType: resourceType,
        };
        const result = await bookingService.getBookingOverview(filters);
        res.status(200).json({ data: result });
    }
    catch (err) {
        if (err instanceof Error && 'statusCode' in err) {
            const appErr = err;
            res.status(appErr.statusCode).json({ error: appErr.message });
            return;
        }
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map