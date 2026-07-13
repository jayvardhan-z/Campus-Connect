import { prisma } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getProfile = asyncHandler(async (req, res, next) => {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!profile) {
    return next(new AppError('Student profile not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: profile
  });
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  const { fullName, department, yearOfStudy, phone, bio } = req.body;

  if (!fullName) {
    return next(new AppError('Full name is required', 400));
  }

  const profile = await prisma.studentProfile.update({
    where: { userId: req.user.id },
    data: {
      fullName,
      department,
      yearOfStudy: yearOfStudy ? parseInt(yearOfStudy, 10) : undefined,
      phone,
      bio
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: profile
  });
});
