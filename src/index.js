require('dotenv').config();

const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'API_PORT'];

const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missing.length > 0) {
  console.error(
    `ERROR: Missing required environment variables: ${missing.join(', ')}`
  );
  process.exit(1);
}

const PORT = process.env.API_PORT;

// App will be wired up in task 1.3
// For now, confirm startup is possible
console.log(`EcoOffice server ready to start on port ${PORT}`);
