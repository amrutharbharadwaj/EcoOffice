"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'API_PORT'];
const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missing.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}
const app_1 = __importDefault(require("./app"));
const PORT = process.env.API_PORT || 3000;
app_1.default.listen(PORT, () => {
    console.log(`EcoOffice backend running on port ${PORT}`);
});
exports.default = app_1.default;
//# sourceMappingURL=index.js.map