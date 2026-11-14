import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { afterEach, test } from 'node:test';
import { createQuizRouter } from '../src/routes/quiz.routes.js';
import { validateQuestionUpdate } from '../src/validation/quiz.validation.js';

let server;

const createTestApp = async () => {
  const model = createFakeQuizModel();
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    const userId = request.headers['x-test-user'];
    if (userId) request.user = { id: userId };
    next();
  });
  app.use('/api/quizzes', createQuizRouter({ QuizModel: model }));
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { model, url: `http://127.0.0.1:${server.address().port}/api/quizzes` };
};

const createFakeQuizModel = () => {
  let nextId = 1;
  const quizzes = [];
  const makeId = () => String(nextId++).padStart(24, '0');

  return class FakeQuiz {
    static async find() {
      return quizzes;
    }

    static async findById(id) {
      return quizzes.find((quiz) => quiz._id === id) || null;
    }

    constructor(data) {
      Object.assign(this, data);
      this.questions = [];
    }

    async save() {
      this._id ||= makeId();
      this.createdAt ||= new Date();
      this.updatedAt = new Date();
      this.questions.forEach((question) => {
        question._id ||= makeId();
      });
      if (!quizzes.includes(this)) quizzes.push(this);
      return this;
    }

    async deleteOne() {
      const index = quizzes.indexOf(this);
      if (index >= 0) quizzes.splice(index, 1);
    }
  };
};

afterEach(async () => {
  if (server) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    server = undefined;
  }
});

test('quiz creation, listing, and detail never expose correct answers', async () => {
  const { url } = await createTestApp();
  const createdResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Math basics', ownerId: 'owner-1' }),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.match(created.id, /^[a-f\d]{24}$/);

  const questionResponse = await fetch(`${url}/${created.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'What is 2 + 2?',
      options: ['3', '4'],
      correctOptionIndex: 1,
    }),
  });
  assert.equal(questionResponse.status, 201);
  const question = await questionResponse.json();
  assert.match(question.id, /^[a-f\d]{24}$/);
  assert.equal(Object.hasOwn(question, 'correctOptionIndex'), false);

  const detail = await (await fetch(`${url}/${created.id}`)).json();
  assert.equal(detail.questions[0].id, question.id);
  assert.equal(Object.hasOwn(detail.questions[0], 'correctOptionIndex'), false);

  const list = await (await fetch(url)).json();
  assert.equal(list[0].questionCount, 1);
  assert.equal(JSON.stringify(list).includes('correctOptionIndex'), false);
});

test('question edits preserve IDs, reorder and delete maintain positions', async () => {
  const { url } = await createTestApp();
  const quizResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'World facts', ownerId: 'owner-1' }),
  });
  const quiz = await quizResponse.json();
  const addQuestion = async (prompt) =>
    fetch(`${url}/${quiz.id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, options: ['A', 'B'], correctOptionIndex: 0 }),
    }).then((response) => response.json());

  const first = await addQuestion('First');
  const second = await addQuestion('Second');
  const updatedResponse = await fetch(`${url}/${quiz.id}/questions/${first.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Updated first' }),
  });
  assert.equal((await updatedResponse.json()).id, first.id);

  const reorderResponse = await fetch(`${url}/${quiz.id}/questions/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionIds: [second.id, first.id] }),
  });
  assert.deepEqual(
    (await reorderResponse.json()).questions.map((question) => question.id),
    [second.id, first.id],
  );

  const deleteResponse = await fetch(`${url}/${quiz.id}/questions/${second.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 204);
  const detail = await (await fetch(`${url}/${quiz.id}`)).json();
  assert.equal(detail.questions.length, 1);
  assert.equal(detail.questions[0].position, 0);
});

test('changing option order keeps the correct answer associated with the same option', async () => {
  const updatedQuestion = validateQuestionUpdate(
    { options: ['B', 'A', 'C'] },
    { options: ['A', 'B'], correctOptionIndex: 1 },
  );
  assert.equal(updatedQuestion.correctOptionIndex, 0);
  assert.throws(
    () =>
      validateQuestionUpdate(
        { options: ['A', 'C'] },
        { options: ['A', 'B'], correctOptionIndex: 1 },
      ),
    /keep the current correct option or provide correctOptionIndex/,
  );

  const { url } = await createTestApp();
  const quiz = await (await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Option order', ownerId: 'owner-1' }),
  })).json();
  const question = await (await fetch(`${url}/${quiz.id}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Choose B',
      options: ['A', 'B'],
      correctOptionIndex: 1,
    }),
  })).json();
  const response = await fetch(`${url}/${quiz.id}/questions/${question.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ options: ['B', 'A', 'C'] }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).options, ['B', 'A', 'C']);
});

test('invalid input is rejected and authenticated owners cannot edit another quiz', async () => {
  const { url } = await createTestApp();
  const invalidResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '   ', ownerId: 'owner-1' }),
  });
  assert.equal(invalidResponse.status, 400);

  const createdResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-user': 'owner-1' },
    body: JSON.stringify({ title: 'Owned quiz' }),
  });
  const quiz = await createdResponse.json();
  const deniedResponse = await fetch(`${url}/${quiz.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-test-user': 'owner-2' },
    body: JSON.stringify({ title: 'Not yours' }),
  });
  assert.equal(deniedResponse.status, 403);
});
