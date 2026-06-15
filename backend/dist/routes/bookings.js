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
const bookingValidators_1 = require("../validators/bookingValidators");
const bookingController = __importStar(require("../controllers/bookingController"));
const authGuard_1 = require("../middleware/authGuard");
const router = (0, express_1.Router)();
// All booking routes require authentication
router.use(authGuard_1.authGuard);
// POST /bookings/desks — Book a desk
router.post('/desks', bookingValidators_1.deskBookingValidation, bookingController.bookDesk);
// POST /bookings/parking — Book a parking spot
router.post('/parking', bookingValidators_1.parkingBookingValidation, bookingController.bookParking);
// DELETE /bookings/:id — Cancel a booking
router.delete('/:id', bookingController.cancelBooking);
// GET /bookings/mine — Get authenticated user's upcoming bookings
router.get('/mine', bookingController.getMyBookings);
exports.default = router;
//# sourceMappingURL=bookings.js.map