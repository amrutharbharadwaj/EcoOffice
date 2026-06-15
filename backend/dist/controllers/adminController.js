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
exports.createDesk = createDesk;
exports.updateDesk = updateDesk;
exports.deleteDesk = deleteDesk;
exports.createParking = createParking;
exports.updateParking = updateParking;
exports.deleteParking = deleteParking;
const express_validator_1 = require("express-validator");
const resourceService = __importStar(require("../services/resourceService"));
/**
 * Maps express-validator errors to the standard error response format.
 */
function formatValidationErrors(errors) {
    const fieldErrors = errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
    }));
    return {
        error: 'Validation failed',
        fields: fieldErrors,
    };
}
function isAppError(err) {
    return err instanceof Error && 'statusCode' in err;
}
/**
 * POST /api/v1/admin/desks
 * Creates a new desk resource.
 * Returns 201 on success, 400 on validation error, 409 on duplicate identifier.
 */
async function createDesk(req, res, next) {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json(formatValidationErrors(errors));
            return;
        }
        const { identifier, floor } = req.body;
        const result = await resourceService.addDesk(identifier, floor);
        res.status(201).json({ data: result });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
/**
 * PUT /api/v1/admin/desks/:id
 * Updates an existing desk resource.
 * Returns 200 on success, 400 on validation error, 404 if not found, 409 on duplicate identifier.
 */
async function updateDesk(req, res, next) {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json(formatValidationErrors(errors));
            return;
        }
        const deskId = parseInt(req.params.id, 10);
        if (isNaN(deskId)) {
            res.status(400).json({ error: 'Invalid desk ID' });
            return;
        }
        const data = {};
        if (req.body.identifier !== undefined)
            data.identifier = req.body.identifier;
        if (req.body.floor !== undefined)
            data.floor = req.body.floor;
        const result = await resourceService.updateDesk(deskId, data);
        res.status(200).json({ data: result });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
/**
 * DELETE /api/v1/admin/desks/:id
 * Deactivates (soft-deletes) a desk resource.
 * Returns 200 on success, 404 if not found, 409 if desk has active bookings.
 */
async function deleteDesk(req, res, next) {
    try {
        const deskId = parseInt(req.params.id, 10);
        if (isNaN(deskId)) {
            res.status(400).json({ error: 'Invalid desk ID' });
            return;
        }
        await resourceService.deactivateDesk(deskId);
        res.status(200).json({ data: { message: 'Desk deactivated successfully' } });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
/**
 * POST /api/v1/admin/parking
 * Creates a new parking spot resource.
 * Returns 201 on success, 400 on validation error, 409 on duplicate identifier.
 */
async function createParking(req, res, next) {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json(formatValidationErrors(errors));
            return;
        }
        const { identifier, locationLabel } = req.body;
        const result = await resourceService.addParkingSpot(identifier, locationLabel);
        res.status(201).json({ data: result });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
/**
 * PUT /api/v1/admin/parking/:id
 * Updates an existing parking spot resource.
 * Returns 200 on success, 400 on validation error, 404 if not found, 409 on duplicate identifier.
 */
async function updateParking(req, res, next) {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json(formatValidationErrors(errors));
            return;
        }
        const spotId = parseInt(req.params.id, 10);
        if (isNaN(spotId)) {
            res.status(400).json({ error: 'Invalid parking spot ID' });
            return;
        }
        const data = {};
        if (req.body.identifier !== undefined)
            data.identifier = req.body.identifier;
        if (req.body.locationLabel !== undefined)
            data.locationLabel = req.body.locationLabel;
        const result = await resourceService.updateParkingSpot(spotId, data);
        res.status(200).json({ data: result });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
/**
 * DELETE /api/v1/admin/parking/:id
 * Deactivates (soft-deletes) a parking spot resource.
 * Returns 200 on success, 404 if not found, 409 if spot has active bookings.
 */
async function deleteParking(req, res, next) {
    try {
        const spotId = parseInt(req.params.id, 10);
        if (isNaN(spotId)) {
            res.status(400).json({ error: 'Invalid parking spot ID' });
            return;
        }
        await resourceService.deactivateParkingSpot(spotId);
        res.status(200).json({ data: { message: 'Parking spot deactivated successfully' } });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
//# sourceMappingURL=adminController.js.map