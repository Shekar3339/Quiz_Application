import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { dirname, resolve } from 'node:path';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import User from '../src/models/User.js';
import connectDB from '../src/config/db.js';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(testDirectory, '..', '.env');
const email = `auth-integration-${randomUUID()}@example.test`;
const password = 'integration-test-password-42';
let server;
let baseUrl;
let databaseConnected = false;

before(async () => {
  const config = dotenv.config({ path: envPath, quiet: true });

  if (config.error) {
    throw new Error('Could not load server/.env for authentication integration tests.');
  }

  await connectDB();
  databaseConnected = true;
  const { default: app } = await import('../src/app.js');
  server = await new Promise((resolveServer) => {
    const instance = app.listen(0, '127.0.0.1', () => resolveServer(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    if (databaseConnected) {
      await User.deleteOne({ email });
    }
  } finally {
    if (server) {
      await new Promise((resolveClose, rejectClose) => {
        server.close((error) => (error ? rejectClose(error) : resolveClose()));
      });
    }

    await mongoose.disconnect();
  }
});

test('registration, duplicate handling, login, profile protection, and logout', async () => {
  const invalidRegistration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A', email, password }),
  });
  assert.equal(invalidRegistration.status, 400);

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Integration Student', email, password }),
  });
  const registrationBody = await registration.json();

  assert.equal(registration.status, 201);
  assert.equal(registrationBody.user.email, email);
  assert.equal(Object.hasOwn(registrationBody.user, 'password'), false);

  const storedUser = await User.findOne({ email }).select('+password');
  assert.ok(storedUser);
  assert.notEqual(storedUser.password, password);
  assert.equal(await bcrypt.compare(password, storedUser.password), true);

  const duplicateRegistration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Another Student', email, password }),
  });
  assert.equal(duplicateRegistration.status, 409);

  const incorrectLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'wrong-password-42' }),
  });
  assert.equal(incorrectLogin.status, 401);

  const anonymousProfile = await fetch(`${baseUrl}/api/auth/profile`);
  assert.equal(anonymousProfile.status, 401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await login.json();
  const setCookie = login.headers.get('set-cookie');
  const cookie = setCookie?.split(';', 1)[0];

  assert.equal(login.status, 200);
  assert.ok(cookie?.startsWith('quiz_session='));
  assert.match(setCookie || '', /HttpOnly/i);
  assert.equal(Object.hasOwn(loginBody.user, 'password'), false);

  const profile = await fetch(`${baseUrl}/api/auth/profile`, {
    headers: { Cookie: cookie },
  });
  const profileBody = await profile.json();
  assert.equal(profile.status, 200);
  assert.equal(profileBody.user.id, registrationBody.user.id);
  assert.equal(Object.hasOwn(profileBody.user, 'password'), false);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
  const clearedCookie = logout.headers.get('set-cookie') || '';
  assert.equal(logout.status, 200);
  assert.match(clearedCookie, /quiz_session=;.*Expires=Thu, 01 Jan 1970/i);

  const profileAfterLogout = await fetch(`${baseUrl}/api/auth/profile`);
  assert.equal(profileAfterLogout.status, 401);
});
