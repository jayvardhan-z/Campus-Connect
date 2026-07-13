import { prisma } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import paginate from '../utils/paginate.js';

export const getClubs = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.club.findMany({
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    }),
    prisma.club.count()
  ]);

  const result = paginate({ data, total, page, limit });

  res.status(200).json({
    status: 'success',
    ...result
  });
});

export const getClubById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const club = await prisma.club.findUnique({
    where: { id }
  });

  if (!club) {
    return next(new AppError('Club not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: club
  });
});

export const createClub = asyncHandler(async (req, res, next) => {
  const { name, description, category } = req.body;

  if (!name || !category) {
    return next(new AppError('Name and category are required', 400));
  }

  const existingClub = await prisma.club.findUnique({ where: { name } });
  if (existingClub) {
    return next(new AppError('Club name already exists', 400));
  }

  const club = await prisma.club.create({
    data: { name, description, category }
  });

  res.status(201).json({
    status: 'success',
    message: 'Club created successfully',
    data: club
  });
});
