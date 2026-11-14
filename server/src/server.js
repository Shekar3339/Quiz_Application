import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import connectDB from './config/db.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const port = process.env.PORT || 5000;

const startServer = async () => {
  const { default: app } = await import('./app.js');
  await connectDB();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}.`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exitCode = 1;
});
