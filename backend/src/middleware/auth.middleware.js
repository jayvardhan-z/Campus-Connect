import { verifyAccessToken } from '../config/jwt.js';
import { prisma } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  try {
    // 2. Verify token
    const decoded = verifyAccessToken(token);

    // 3. Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4. Grant access and attach user to request object
    req.user = user;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired access token. Please login again.', 401));
  }
});
