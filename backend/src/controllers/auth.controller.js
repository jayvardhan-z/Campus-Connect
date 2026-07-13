import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../config/jwt.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Helper to sanitize user output
const sanitizeUser = (user) => {
  const { passwordHash, verificationToken, verificationTokenExpires, resetPasswordToken, resetPasswordTokenExpires, refreshToken, ...sanitized } = user;
  return sanitized;
};

export const register = asyncHandler(async (req, res, next) => {
  const { email, password, fullName, department, yearOfStudy, phone, bio } = req.body;

  if (!email || !password || !fullName) {
    return next(new AppError('Email, password, and full name are required', 400));
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }

  // Hash password with 12 rounds
  const passwordHash = await bcrypt.hash(password, 12);

  // Generate verification token (24h expiry)
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Create user and profile in an atomic nested transaction
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'student',
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
      profile: {
        create: {
          fullName,
          department,
          yearOfStudy: yearOfStudy ? parseInt(yearOfStudy, 10) : undefined,
          phone,
          bio,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  // Mock sending verification email
  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
  console.log('====================================================');
  console.log(`VERIFICATION EMAIL LOG FOR: ${email}`);
  console.log(`Verification Link: ${verificationLink}`);
  console.log('====================================================');

  res.status(201).json({
    status: 'success',
    message: 'Registration successful. Please check your email to verify your account.',
    user: sanitizeUser(user),
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // Check if verified
  if (!user.isVerified) {
    return next(new AppError('Please verify your email address before logging in.', 403));
  }

  // Sign tokens
  const payload = { id: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token in DB
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  // Set cookie for refresh token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    status: 'success',
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  });
});

export const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    return next(new AppError('Verification token is missing', 400));
  }

  // Find user with matching token and unexpired date
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationTokenExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // Update user verification status and clear tokens
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    },
  });

  res.status(200).json({
    status: 'success',
    message: 'Email successfully verified. You can now log in.',
  });
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  // Try to get token from body, query or cookies
  const token = req.body.refreshToken || req.cookies.refreshToken;

  if (!token) {
    return next(new AppError('Refresh token is required', 400));
  }

  try {
    const decoded = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.refreshToken !== token) {
      return next(new AppError('Invalid refresh token', 401));
    }

    // Generate new access token
    const newAccessToken = signAccessToken({ id: user.id, role: user.role });

    res.status(200).json({
      status: 'success',
      accessToken: newAccessToken,
    });
  } catch (err) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }
});

export const logout = asyncHandler(async (req, res, next) => {
  const token = req.body.refreshToken || req.cookies.refreshToken;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await prisma.user.update({
        where: { id: decoded.id },
        data: { refreshToken: null },
      });
    } catch (err) {
      // Ignore token verification errors during logout
    }
  }

  res.clearCookie('refreshToken');
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});
