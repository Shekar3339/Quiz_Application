import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AUTH_COOKIE_NAME, getJwtSecret } from '../config/auth.js';

const unauthorized = (response) =>
  response.status(401).json({ message: 'Please sign in to continue.' });

const requireAuth = async (request, response, next) => {
  const token = request.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return unauthorized(response);
  }

  let payload;

  try {
    payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'quiz-application',
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return unauthorized(response);
    }

    return next(error);
  }

  if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
    return unauthorized(response);
  }

  const user = await User.findById(payload.sub).select('_id name email createdAt');

  if (!user) {
    return unauthorized(response);
  }

  request.user = user;
  return next();
};

export default requireAuth;
