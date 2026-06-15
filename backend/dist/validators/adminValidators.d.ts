/**
 * Validation chains for POST /api/v1/admin/desks
 * identifier: required, 1–50 chars
 * floor: required, integer
 */
export declare const createDeskValidation: import("express-validator").ValidationChain[];
/**
 * Validation chains for PUT /api/v1/admin/desks/:id
 * identifier: optional, 1–50 chars
 * floor: optional, integer
 */
export declare const updateDeskValidation: import("express-validator").ValidationChain[];
/**
 * Validation chains for POST /api/v1/admin/parking
 * identifier: required, 1–50 chars
 * locationLabel: required, 1–100 chars
 */
export declare const createParkingValidation: import("express-validator").ValidationChain[];
/**
 * Validation chains for PUT /api/v1/admin/parking/:id
 * identifier: optional, 1–50 chars
 * locationLabel: optional, 1–100 chars
 */
export declare const updateParkingValidation: import("express-validator").ValidationChain[];
//# sourceMappingURL=adminValidators.d.ts.map