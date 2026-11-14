import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import authRouter from './routes/auth.routes.js';
import healthRouter from './routes/health.routes.js';
import quizRouter from './routes/quiz.routes.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/auth', authRouter);

app.use((error, _request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request body must contain valid JSON.' });
  }

  if (error.code === 11000) {
    return response.status(409).json({ message: 'An account with this email already exists.' });
  }

  if (error.name === 'ValidationError') {
    return response.status(400).json({ message: 'Submitted user information is invalid.' });
  }

  console.error('API request failed:', error.name || 'UnknownError', error.code || '');
  return response.status(500).json({ message: 'An unexpected server error occurred.' });
});

export default app;
