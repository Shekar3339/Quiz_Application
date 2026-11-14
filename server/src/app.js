import cors from 'cors';
import express from 'express';
import healthRouter from './routes/health.routes.js';
import quizRouter from './routes/quiz.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/quizzes', quizRouter);

export default app;
