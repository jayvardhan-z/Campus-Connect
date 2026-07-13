import { prisma } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import paginate from '../utils/paginate.js';

export const getAnnouncements = asyncHandler(async (req, res, next) => {
  const { clubId } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (clubId) {
    filter.clubId = clubId;
  }

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where: filter,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        postedBy: { select: { email: true } },
        club: { select: { name: true } }
      }
    }),
    prisma.announcement.count({ where: filter })
  ]);

  const result = paginate({ data, total, page, limit });

  res.status(200).json({
    status: 'success',
    ...result
  });
});

export const createAnnouncement = asyncHandler(async (req, res, next) => {
  const { title, content, clubId } = req.body;

  if (!title || !content) {
    return next(new AppError('Title and content are required', 400));
  }

  if (clubId) {
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      return next(new AppError('Club not found', 404));
    }
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      clubId: clubId || null,
      postedById: req.user.id
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Announcement posted successfully',
    data: announcement
  });
});

export const deleteAnnouncement = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) {
    return next(new AppError('Announcement not found', 404));
  }

  await prisma.announcement.delete({ where: { id } });

  res.status(200).json({
    status: 'success',
    message: 'Announcement deleted successfully'
  });
});
