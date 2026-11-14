import cors from 'cors';
import express from 'express';
import healthRouter from './routes/health.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/health', healthRouter);

export default app;
