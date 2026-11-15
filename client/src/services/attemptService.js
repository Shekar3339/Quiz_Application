import { apiRequest } from './api.js';

export const attemptService = {
  start: (quizId) => apiRequest('/attempts/start', { method: 'POST', body: JSON.stringify({ quizId }) }),
  active: (quizId) => apiRequest(`/attempts/active/${quizId}`),
  saveAnswers: (attemptId, answers) => apiRequest(`/attempts/${attemptId}/answers`, { method: 'POST', body: JSON.stringify({ answers }) }),
  submit: (attemptId, answers) => apiRequest(`/attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  history: () => apiRequest('/attempts/mine'),
  get: (attemptId) => apiRequest(`/attempts/${attemptId}`),
};
