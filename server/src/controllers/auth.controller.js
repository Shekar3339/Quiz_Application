import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { clearAuthCookie, setAuthCookie } from '../config/auth.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedFields = {
  register: new Set(['name', 'email', 'password']),
  login: new Set(['email', 'password']),
};

const validateCredentials = (body, mode) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  if (Object.keys(body).some((key) => !allowedFields[mode].has(key))) {
    return { error: 'Request contains unsupported fields.' };
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  if (mode === 'register') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (name.length < 2 || name.length > 80) {
      return { error: 'Name must be between 2 and 80 characters.' };
    }

    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return { error: 'Password must be at least 8 characters and no more than 72 bytes.' };
    }

    return { data: { name, email, password } };
  }

  if (!password || Buffer.byteLength(password, 'utf8') > 72) {
    return { error: 'Enter a password no longer than 72 bytes.' };
  }

  return { data: { email, password } };
};

export const toPublicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

export const register = async (request, response) => {
  const { data, error } = validateCredentials(request.body, 'register');

  if (error) {
    return response.status(400).json({ message: error });
  }

  const existingUser = await User.exists({ email: data.email });

  if (existingUser) {
    return response.status(409).json({ message: 'An account with this email already exists.' });
  }

  const user = await User.create(data);

  return response.status(201).json({
    message: 'Account created. You can now sign in.',
    user: toPublicUser(user),
  });
};

export const login = async (request, response) => {
  const { data, error } = validateCredentials(request.body, 'login');

  if (error) {
    return response.status(400).json({ message: error });
  }

  const user = await User.findOne({ email: data.email }).select('+password');
  const passwordMatches = user ? await bcrypt.compare(data.password, user.password) : false;

  if (!passwordMatches) {
    return response.status(401).json({ message: 'Invalid email or password.' });
  }

  setAuthCookie(response, user._id);

  return response.json({
    message: 'Signed in successfully.',
    user: toPublicUser(user),
  });
};

export const getProfile = (request, response) => {
  response.json({ user: toPublicUser(request.user) });
};

export const logout = (_request, response) => {
  clearAuthCookie(response);
  response.json({ message: 'Signed out successfully.' });
};
