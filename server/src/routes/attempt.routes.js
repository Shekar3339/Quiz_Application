import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import {
  getActiveAttempt, getAttempt, getAttemptHistory, saveAnswers, startAttempt, submitAttempt,
} from '../controllers/attempt.controller.js';

const router = Router();
router.use(requireAuth);
router.post('/start', startAttempt);
router.get('/mine', getAttemptHistory);
router.get('/active/:quizId', getActiveAttempt);
router.post('/:id/answers', saveAnswers);
router.post('/:id/submit', submitAttempt);
router.get('/:id', getAttempt);
router.use((error, _request, response, _next) => {
  if (Number.isInteger(error.status)) return response.status(error.status).json({ message: error.message });
  if (error.name === 'VersionError') return response.status(409).json({ message: 'This attempt changed in another request. Refresh and try again.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return response.status(400).json({ message: 'Attempt data is invalid.' });
  console.error('Attempt API error:', error.name || 'UnknownError');
  return response.status(500).json({ message: 'An unexpected server error occurred.' });
});

export default router;
