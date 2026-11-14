import jwt from 'jsonwebtoken';

export const AUTH_COOKIE_NAME = 'quiz_session';
export const AUTH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes.');
  }

  return secret;
};

export const setAuthCookie = (response, userId) => {
  const token = jwt.sign({ sub: String(userId) }, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '7d',
    issuer: 'quiz-application',
  });

  response.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: AUTH_TOKEN_MAX_AGE,
  });
};

export const clearAuthCookie = (response) => {
  response.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
};
