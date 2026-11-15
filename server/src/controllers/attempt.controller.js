import mongoose from 'mongoose';
import Attempt from '../models/attempt.model.js';
import Quiz from '../models/quiz.model.js';

export const ATTEMPT_DURATION_MS = 30 * 60 * 1000;
const idPattern = /^[a-f\d]{24}$/i;

const fail = (status, message) => Object.assign(new Error(message), { status });
const assertId = (value, label) => {
  if (!idPattern.test(String(value ?? ''))) throw fail(400, `Invalid ${label}.`);
};
const sortedQuestions = (quiz) => [...quiz.questions].sort((a, b) => a.position - b.position);

export const safeAttempt = (attempt, { includeQuestions = true } = {}) => {
  const questions = attempt.questionSnapshot || [];
  const answers = attempt.answers || [];
  return {
    id: String(attempt._id), quizId: String(attempt.quizId), quizTitle: attempt.quizTitle,
    status: attempt.status, answers: answers.map((answer) => ({
      questionId: String(answer.questionId), selectedOptionIndex: answer.selectedOptionIndex,
    })),
    startedAt: attempt.startedAt, deadline: attempt.deadline, submittedAt: attempt.submittedAt,
    totalQuestions: attempt.totalQuestions, totalMarks: attempt.totalMarks,
    ...(includeQuestions && attempt.status === 'in_progress' ? {
      questions: questions.map((question) => ({
        id: String(question.questionId), prompt: question.prompt, options: question.options,
        position: question.position,
      })),
    } : {}),
    ...(attempt.status !== 'in_progress' ? {
      correctAnswers: attempt.correctAnswers, incorrectAnswers: attempt.incorrectAnswers,
      unansweredQuestions: attempt.unansweredQuestions, obtainedMarks: attempt.obtainedMarks,
      percentage: attempt.percentage, timeTaken: attempt.timeTaken,
    } : {}),
  };
};

export const scoreAttempt = (attempt, now) => {
  const answerMap = new Map((attempt.answers || []).map((answer) => [String(answer.questionId), answer.selectedOptionIndex]));
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  for (const question of attempt.questionSnapshot) {
    const selected = answerMap.get(String(question.questionId));
    if (selected === undefined) continue;
    if (selected === question.correctOptionIndex) correctAnswers += 1;
    else incorrectAnswers += 1;
  }
  const unansweredQuestions = attempt.totalQuestions - correctAnswers - incorrectAnswers;
  attempt.correctAnswers = correctAnswers;
  attempt.incorrectAnswers = incorrectAnswers;
  attempt.unansweredQuestions = unansweredQuestions;
  attempt.obtainedMarks = correctAnswers;
  attempt.percentage = attempt.totalMarks ? Math.round((correctAnswers / attempt.totalMarks) * 10000) / 100 : 0;
  attempt.timeTaken = Math.max(0, Math.min(Math.floor((now - attempt.startedAt) / 1000), Math.floor((attempt.deadline - attempt.startedAt) / 1000)));
  attempt.submittedAt = now;
  attempt.status = now >= attempt.deadline ? 'expired' : 'submitted';
};

const ownedAttempt = async (attemptId, userId) => {
  assertId(attemptId, 'attempt ID');
  const attempt = await Attempt.findOne({ _id: attemptId, userId }).select('+questionSnapshot.correctOptionIndex +questionSnapshot');
  if (!attempt) throw fail(404, 'Attempt not found.');
  return attempt;
};

const finishIfExpired = async (attempt) => {
  if (attempt.status === 'in_progress' && Date.now() >= new Date(attempt.deadline).getTime()) {
    scoreAttempt(attempt, new Date());
    await attempt.save();
  }
  return attempt;
};

export const startAttempt = async (request, response) => {
  const { quizId } = request.body ?? {};
  assertId(quizId, 'quiz ID');
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw fail(404, 'Quiz not found.');
  const questions = sortedQuestions(quiz);
  if (!questions.length) throw fail(409, 'This quiz has no questions yet.');

  const existing = await Attempt.findOne({ userId: request.user._id, quizId, status: 'in_progress' })
    .select('+questionSnapshot.correctOptionIndex +questionSnapshot');
  if (existing) {
    await finishIfExpired(existing);
    if (existing.status === 'in_progress') return response.json({ attempt: safeAttempt(existing) });
  }

  const startedAt = new Date();
  let attempt;
  try {
    attempt = await Attempt.create({
      userId: request.user._id, quizId: quiz._id, quizTitle: quiz.title,
      questionSnapshot: questions.map((question) => ({
        questionId: question._id, prompt: question.prompt, options: [...question.options],
        correctOptionIndex: question.correctOptionIndex, position: question.position,
      })),
      startedAt, deadline: new Date(startedAt.getTime() + ATTEMPT_DURATION_MS),
      totalQuestions: questions.length, totalMarks: questions.length,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const concurrentAttempt = await Attempt.findOne({ userId: request.user._id, quizId, status: 'in_progress' })
      .select('+questionSnapshot.correctOptionIndex +questionSnapshot');
    if (!concurrentAttempt) throw error;
    return response.json({ attempt: safeAttempt(concurrentAttempt) });
  }
  const fullAttempt = await Attempt.findById(attempt._id).select('+questionSnapshot.correctOptionIndex +questionSnapshot');
  response.status(201).json({ attempt: safeAttempt(fullAttempt) });
};

export const getActiveAttempt = async (request, response) => {
  assertId(request.params.quizId, 'quiz ID');
  let attempt = await Attempt.findOne({ userId: request.user._id, quizId: request.params.quizId, status: 'in_progress' })
    .select('+questionSnapshot.correctOptionIndex +questionSnapshot');
  if (!attempt) return response.json({ attempt: null });
  attempt = await finishIfExpired(attempt);
  response.json({ attempt: safeAttempt(attempt) });
};

export const saveAnswers = async (request, response) => {
  if (!request.body || Object.keys(request.body).some((key) => key !== 'answers')) throw fail(400, 'Save answers using the answers field only.');
  const attempt = await ownedAttempt(request.params.id, request.user._id);
  await finishIfExpired(attempt);
  if (attempt.status !== 'in_progress') throw fail(409, 'This attempt is already closed.');
  const answers = request.body?.answers;
  if (!Array.isArray(answers) || answers.length > attempt.totalQuestions) throw fail(400, 'answers must be an array of valid selections.');
  const questionMap = new Map(attempt.questionSnapshot.map((question) => [String(question.questionId), question]));
  const submitted = new Map();
  for (const answer of answers) {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer) || !idPattern.test(String(answer.questionId ?? ''))) throw fail(400, 'Each answer must include a valid questionId.');
    const question = questionMap.get(String(answer.questionId));
    if (!question) throw fail(400, 'An answer refers to a question outside this attempt.');
    if (submitted.has(String(answer.questionId))) throw fail(400, 'Each question can appear only once in answers.');
    if (!Number.isInteger(answer.selectedOptionIndex) || answer.selectedOptionIndex < 0 || answer.selectedOptionIndex >= question.options.length) throw fail(400, 'Each selectedOptionIndex must refer to an option in that question.');
    submitted.set(String(answer.questionId), answer.selectedOptionIndex);
  }
  attempt.answers = [...submitted].map(([questionId, selectedOptionIndex]) => ({ questionId: new mongoose.Types.ObjectId(questionId), selectedOptionIndex }));
  await attempt.save();
  response.json({ attempt: safeAttempt(attempt) });
};

export const submitAttempt = async (request, response) => {
  if (request.body && Object.keys(request.body).some((key) => key !== 'answers')) throw fail(400, 'Submit answers only; scores are calculated by the server.');
  const attempt = await ownedAttempt(request.params.id, request.user._id);
  if (attempt.status !== 'in_progress') throw fail(409, 'This attempt has already been submitted.');
  const now = new Date();
  const deadlinePassed = now >= new Date(attempt.deadline);
  // After the server deadline, score only the last server-saved answers. A late
  // browser request must not replace those answers with post-deadline choices.
  if (!deadlinePassed && request.body?.answers !== undefined) {
    // Reuse the same strict validation and persistence path before scoring.
    request.body = { answers: request.body.answers };
    const answers = request.body.answers;
    if (!Array.isArray(answers) || answers.length > attempt.totalQuestions) throw fail(400, 'answers must be an array of valid selections.');
    const questionMap = new Map(attempt.questionSnapshot.map((question) => [String(question.questionId), question]));
    const submitted = new Map();
    for (const answer of answers) {
      const question = answer && questionMap.get(String(answer.questionId));
      if (!question || !Number.isInteger(answer.selectedOptionIndex) || answer.selectedOptionIndex < 0 || answer.selectedOptionIndex >= question.options.length) throw fail(400, 'An answer contains an invalid question or option.');
      submitted.set(String(answer.questionId), answer.selectedOptionIndex);
    }
    attempt.answers = [...submitted].map(([questionId, selectedOptionIndex]) => ({ questionId: new mongoose.Types.ObjectId(questionId), selectedOptionIndex }));
  }
  scoreAttempt(attempt, now);
  await attempt.save();
  response.json({ attempt: safeAttempt(attempt, { includeQuestions: false }) });
};

export const getAttempt = async (request, response) => {
  let attempt = await ownedAttempt(request.params.id, request.user._id);
  attempt = await finishIfExpired(attempt);
  response.json({ attempt: safeAttempt(attempt, { includeQuestions: false }) });
};

export const getAttemptHistory = async (request, response) => {
  const expired = await Attempt.find({ userId: request.user._id, status: 'in_progress', deadline: { $lte: new Date() } })
    .select('+questionSnapshot.correctOptionIndex +questionSnapshot');
  for (const attempt of expired) await finishIfExpired(attempt);
  const attempts = await Attempt.find({ userId: request.user._id }).sort({ startedAt: -1 }).limit(100);
  const completedAttempts = attempts.filter((attempt) => attempt.status !== 'in_progress');
  const averageScore = completedAttempts.length
    ? completedAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / completedAttempts.length
    : 0;
  response.json({ attempts: attempts.map((attempt) => ({
    id: String(attempt._id), quizId: String(attempt.quizId), quizTitle: attempt.quizTitle,
    startedAt: attempt.startedAt, completedAt: attempt.submittedAt, status: attempt.status,
    percentage: attempt.percentage, obtainedMarks: attempt.obtainedMarks, totalMarks: attempt.totalMarks,
    timeTaken: attempt.timeTaken,
  })), totalAttempts: attempts.length, averageScore: Math.round(averageScore * 100) / 100 });
};
