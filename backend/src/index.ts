import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'API_PORT'];
const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missing.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

import app from './app';

const PORT = process.env.API_PORT || 3000;

app.listen(PORT, () => {
  console.log(`EcoOffice backend running on port ${PORT}`);
});

export default app;
