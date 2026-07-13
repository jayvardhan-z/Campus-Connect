import { prisma } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import paginate from '../utils/paginate.js';
import { registerForEvent, cancelRegistration } from '../services/registration.service.js';

export const getMyRegistrations = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.registration.findMany({
      where: { userId: req.user.id },
      skip,
      take: limit,
      orderBy: { registeredAt: 'desc' },
      include: {
        event: {
          include: {
            club: { select: { name: true } }
          }
        }
      }
    }),
    prisma.registration.count({ where: { userId: req.user.id } })
  ]);

  const result = paginate({ data, total, page, limit });

  res.status(200).json({
    status: 'success',
    ...result
  });
});

export const getEventParticipants = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  const [data, total] = await Promise.all([
    prisma.registration.findMany({
      where: { eventId },
      skip,
      take: limit,
      orderBy: { registeredAt: 'asc' },
      include: {
        user: {
          select: {
            email: true,
            profile: {
              select: {
                fullName: true,
                department: true,
                yearOfStudy: true,
                phone: true
              }
            }
          }
        }
      }
    }),
    prisma.registration.count({ where: { eventId } })
  ]);

  const result = paginate({ data, total, page, limit });

  res.status(200).json({
    status: 'success',
    ...result
  });
});

export const createRegistration = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  const result = await registerForEvent(eventId, req.user.id);
  res.status(201).json(result);
});

export const removeRegistration = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;
  const result = await cancelRegistration(eventId, req.user.id);
  res.status(200).json(result);
});
