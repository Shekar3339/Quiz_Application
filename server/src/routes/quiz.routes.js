import { Router } from 'express';
import Quiz from '../models/quiz.model.js';
import {
  RequestValidationError,
  validateQuestionCreate,
  validateQuestionOrder,
  validateQuestionUpdate,
  validateQuizCreate,
  validateQuizUpdate,
} from '../validation/quiz.validation.js';

const idString = (id) => String(id);

const serializeQuestion = (question) => ({
  id: idString(question._id),
  prompt: question.prompt,
  options: [...question.options],
  position: question.position,
});

const serializeQuiz = (quiz) => ({
  id: idString(quiz._id),
  title: quiz.title,
  description: quiz.description,
  questions: [...quiz.questions]
    .sort((left, right) => left.position - right.position)
    .map(serializeQuestion),
  createdAt: quiz.createdAt,
  updatedAt: quiz.updatedAt,
});

const findQuiz = async (QuizModel, quizId) => {
  if (!/^[a-f\d]{24}$/i.test(quizId)) return null;
  return QuizModel.findById(quizId);
};

const requireOwnerWhenAuthenticated = (request, quiz) => {
  const authenticatedOwnerId = request.user?.id ?? request.user?._id;
  if (authenticatedOwnerId && idString(quiz.ownerId) !== idString(authenticatedOwnerId)) {
    const error = new Error('You do not own this quiz.');
    error.status = 403;
    throw error;
  }
};

const notFound = () => {
  const error = new Error('Quiz not found.');
  error.status = 404;
  return error;
};

export const createQuizRouter = ({ QuizModel = Quiz } = {}) => {
  const router = Router();

  router.get('/', async (_request, response) => {
    const quizzes = await QuizModel.find();
    response.json(
      quizzes
        .slice()
        .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
        .map((quiz) => ({
          id: idString(quiz._id),
          title: quiz.title,
          description: quiz.description,
          questionCount: quiz.questions.length,
          createdAt: quiz.createdAt,
          updatedAt: quiz.updatedAt,
        })),
    );
  });

  router.post('/', async (request, response) => {
    const body = request.body ?? {};
    const authenticatedUserId = request.user?.id ?? request.user?._id;
    const authenticatedOwnerId = authenticatedUserId ? idString(authenticatedUserId) : undefined;
    if (
      authenticatedOwnerId &&
      body.ownerId &&
      idString(body.ownerId) !== idString(authenticatedOwnerId)
    ) {
      const error = new Error('A quiz can only be created for the authenticated user.');
      error.status = 403;
      throw error;
    }

    const quiz = new QuizModel(
      validateQuizCreate(body, authenticatedOwnerId ?? body.ownerId),
    );
    await quiz.save();
    response.status(201).json(serializeQuiz(quiz));
  });

  router.get('/:quizId', async (request, response) => {
    const quiz = await findQuiz(QuizModel, request.params.quizId);
    if (!quiz) throw notFound();
    response.json(serializeQuiz(quiz));
  });

  router.patch('/:quizId', async (request, response) => {
    const quiz = await findQuiz(QuizModel, request.params.quizId);
    if (!quiz) throw notFound();
    requireOwnerWhenAuthenticated(request, quiz);
    Object.assign(quiz, validateQuizUpdate(request.body));
    await quiz.save();
    response.json(serializeQuiz(quiz));
  });

  router.delete('/:quizId', async (request, response) => {
    const quiz = await findQuiz(QuizModel, request.params.quizId);
    if (!quiz) throw notFound();
    requireOwnerWhenAuthenticated(request, quiz);
    await quiz.deleteOne();
    response.status(204).end();
  });

  router.post('/:quizId/questions', async (request, response) => {
    const quiz = await findQuiz(QuizModel, request.params.quizId);
    if (!quiz) throw notFound();
    requireOwnerWhenAuthenticated(request, quiz);
    const question = validateQuestionCreate(request.body, quiz.questions.length);
    quiz.questions.push(question);
    await quiz.save();
    response.status(201).json(serializeQuestion(quiz.questions.at(-1)));
  });

  router.patch('/:quizId/questions/:questionId', async (request, response) => {
    const quiz = await findQuiz(QuizModel, request.params.quizId);
    if (!quiz) throw notFound();
    requireOwnerWhenAuthenticated(request, quiz);
    const question = quiz.questions.find(
      (item) => idString(item._id) === request.params.questionId,
    );
    if (!question) throw notFound();
    Object.assign(question, validateQuestionUpdate(request.body, question));
    await quiz.save();
    response.json(serializeQuestion(question));
  });

  router.delete('/:quizId/questions/:questionId', async (request, response) => {
    const quiz = await findQuiz(QuizModel, request.params.quizId);
    if (!quiz) throw notFound();
    requireOwnerWhenAuthenticated(request, quiz);
    const questionIndex = quiz.questions.findIndex(
      (item) => idString(item._id) === request.params.questionId,
    );
    if (questionIndex === -1) throw notFound();
    quiz.questions.splice(questionIndex, 1);
    quiz.questions.forEach((question, index) => {
      question.position = index;
    });
    await quiz.save();
    response.status(204).end();
  });

  router.put('/:quizId/questions/order', async (request, response) => {
    const quiz = await findQuiz(QuizModel, request.params.quizId);
    if (!quiz) throw notFound();
    requireOwnerWhenAuthenticated(request, quiz);
    const questionIds = validateQuestionOrder(request.body.questionIds, quiz.questions);
    questionIds.forEach((id, position) => {
      const question = quiz.questions.find((item) => idString(item._id) === id);
      question.position = position;
    });
    await quiz.save();
    response.json(serializeQuiz(quiz));
  });

  router.use((error, _request, response, _next) => {
    if (error instanceof RequestValidationError || Number.isInteger(error.status)) {
      response.status(error.status).json({ error: error.message });
      return;
    }

    console.error('Quiz API error:', error);
    response.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  return router;
};

export default createQuizRouter();
