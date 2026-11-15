import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeAttempt, scoreAttempt } from '../src/controllers/attempt.controller.js';

const questionId = '68e000000000000000000001';
const makeAttempt = ({ answers = [], deadline = new Date('2026-11-15T10:30:00Z') } = {}) => ({
  _id: '68e000000000000000000010', quizId: '68e000000000000000000020', quizTitle: 'Basics',
  questionSnapshot: [
    { questionId, prompt: '2 + 2?', options: ['3', '4'], correctOptionIndex: 1, position: 0 },
    { questionId: '68e000000000000000000002', prompt: '3 + 3?', options: ['5', '6'], correctOptionIndex: 1, position: 1 },
    { questionId: '68e000000000000000000003', prompt: '1 + 1?', options: ['2', '3'], correctOptionIndex: 0, position: 2 },
  ], answers: answers.map(([id, selectedOptionIndex]) => ({ questionId: id, selectedOptionIndex })),
  startedAt: new Date('2026-11-15T10:00:00Z'), deadline, totalQuestions: 3, totalMarks: 3,
  status: 'in_progress', submittedAt: null,
});

test('scores correct, incorrect, and unanswered questions from the server snapshot', () => {
  const attempt = makeAttempt({ answers: [[questionId, 1], ['68e000000000000000000002', 0]] });
  scoreAttempt(attempt, new Date('2026-11-15T10:05:00Z'));
  assert.equal(attempt.correctAnswers, 1);
  assert.equal(attempt.incorrectAnswers, 1);
  assert.equal(attempt.unansweredQuestions, 1);
  assert.equal(attempt.obtainedMarks, 1);
  assert.equal(attempt.totalMarks, 3);
  assert.equal(attempt.percentage, 33.33);
  assert.equal(attempt.timeTaken, 300);
  assert.equal(attempt.status, 'submitted');
});

test('marks a late submission expired and caps time at the server deadline', () => {
  const attempt = makeAttempt({ deadline: new Date('2026-11-15T10:30:00Z') });
  scoreAttempt(attempt, new Date('2026-11-15T10:35:00Z'));
  assert.equal(attempt.status, 'expired');
  assert.equal(attempt.timeTaken, 1800);
  assert.equal(attempt.unansweredQuestions, 3);
});

test('attempt responses never expose the stored correct option index', () => {
  const attempt = makeAttempt();
  const publicAttempt = safeAttempt(attempt);
  assert.equal(publicAttempt.questions[0].id, questionId);
  assert.equal(Object.hasOwn(publicAttempt.questions[0], 'correctOptionIndex'), false);
  assert.equal(JSON.stringify(publicAttempt).includes('correctOptionIndex'), false);
});
