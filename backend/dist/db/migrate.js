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
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function runMigrations() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('ERROR: DATABASE_URL environment variable is required');
        process.exit(1);
    }
    const client = new pg_1.Client({ connectionString: databaseUrl });
    try {
        await client.connect();
        console.log('Connected to database');
        const migrationsDir = path.resolve(__dirname, '../../migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.error(`ERROR: Migrations directory not found: ${migrationsDir}`);
            process.exit(1);
        }
        const files = fs.readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();
        if (files.length === 0) {
            console.log('No migration files found');
            return;
        }
        console.log(`Found ${files.length} migration file(s)`);
        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf-8');
            console.log(`Running migration: ${file}...`);
            await client.query(sql);
            console.log(`  ✓ ${file} completed`);
        }
        console.log('\nAll migrations completed successfully');
    }
    catch (error) {
        console.error('Migration failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
    finally {
        await client.end();
        console.log('Database connection closed');
    }
}
runMigrations();
//# sourceMappingURL=migrate.js.map