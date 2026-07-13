import { prisma, pool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import paginate from '../utils/paginate.js';

/*
  SQL INJECTION PREVENTION WARNING:
  We are constructing the query's WHERE clause dynamically. To prevent SQL Injection:
  1. We NEVER concatenate user input variables directly into the query string.
  2. We build the query structure dynamically using placeholders ($1, $2, etc.) 
     and pass user input parameters inside the query execution array.
  3. Query keywords (such as sort directions) are whitelisted and never interpolated 
     directly from user parameters.
*/
export const getEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  const whereParts = [];
  const params = [];

  // Default to showing active events only
  whereParts.push("e.status = 'active'");

  // q -> search across title + club name
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    whereParts.push(`(e.title ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }

  // club -> filter by club_id
  if (req.query.club) {
    params.push(req.query.club);
    whereParts.push(`e.club_id = $${params.length}::uuid`);
  }

  // category -> filter by club.category
  if (req.query.category) {
    params.push(req.query.category);
    whereParts.push(`c.category = $${params.length}`);
  }

  // date -> filter events on an exact date, or dateFrom/dateTo for a range
  if (req.query.date) {
    params.push(req.query.date);
    whereParts.push(`e.event_date = $${params.length}::date`);
  } else {
    if (req.query.dateFrom) {
      params.push(req.query.dateFrom);
      whereParts.push(`e.event_date >= $${params.length}::date`);
    }
    if (req.query.dateTo) {
      params.push(req.query.dateTo);
      whereParts.push(`e.event_date <= $${params.length}::date`);
    }
  }

  // timeframe -> 'upcoming' | 'past'
  if (req.query.timeframe === 'upcoming') {
    whereParts.push(`e.event_date >= CURRENT_DATE`);
  } else if (req.query.timeframe === 'past') {
    whereParts.push(`e.event_date < CURRENT_DATE`);
  }

  // department -> filter to events with at least one registration from students in that department
  if (req.query.department) {
    params.push(req.query.department);
    whereParts.push(`EXISTS (
      SELECT 1 
      FROM registrations r 
      INNER JOIN student_profiles sp ON r.user_id = sp.user_id 
      WHERE r.event_id = e.id 
        AND sp.department = $${params.length} 
        AND r.status = 'registered'
    )`);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  // Whitelisted sort ordering
  let orderBy = 'ORDER BY e.event_date ASC';
  if (req.query.sort === 'latest') {
    orderBy = 'ORDER BY e.event_date DESC';
  } else if (req.query.sort === 'oldest') {
    orderBy = 'ORDER BY e.event_date ASC';
  } else if (req.query.sort === 'popular') {
    orderBy = 'ORDER BY registration_count DESC, e.event_date ASC';
  }

  // 1. Fetch total count
  const countQuery = `
    SELECT COUNT(*)::INTEGER 
    FROM events e
    INNER JOIN clubs c ON e.club_id = c.id
    ${whereClause}
  `;
  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0].count;

  // 2. Fetch data
  const queryParams = [...params];
  queryParams.push(limit);
  queryParams.push(offset);

  const selectQuery = `
    SELECT 
      e.id, 
      e.club_id, 
      e.title, 
      e.description, 
      e.venue, 
      e.event_date, 
      e.event_time, 
      e.total_seats, 
      e.remaining_seats, 
      e.status, 
      e.is_demo, 
      e.created_by, 
      e.created_at, 
      e.updated_at,
      c.name AS club_name,
      c.category AS club_category,
      (SELECT COUNT(*)::INTEGER FROM registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registration_count
    FROM events e
    INNER JOIN clubs c ON e.club_id = c.id
    ${whereClause}
    ${orderBy}
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const dataRes = await pool.query(selectQuery, queryParams);
  
  // Map back to keep compatibility with standard Prisma shape expected by client
  const mappedData = dataRes.rows.map(row => ({
    id: row.id,
    clubId: row.club_id,
    title: row.title,
    description: row.description,
    venue: row.venue,
    eventDate: row.event_date,
    eventTime: row.event_time,
    totalSeats: row.total_seats,
    remainingSeats: row.remaining_seats,
    status: row.status,
    isDemo: row.is_demo,
    createdById: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    club: {
      name: row.club_name,
      category: row.club_category
    },
    registrationCount: row.registration_count
  }));

  const result = paginate({ data: mappedData, total, page, limit });

  res.status(200).json({
    status: 'success',
    ...result
  });
});

export const getEventById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { club: { select: { name: true } } }
  });

  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: event
  });
});

export const createEvent = asyncHandler(async (req, res, next) => {
  const { clubId, title, description, venue, eventDate, eventTime, totalSeats } = req.body;

  if (!clubId || !title || !eventDate || !totalSeats) {
    return next(new AppError('Club ID, title, event date, and total seats are required', 400));
  }

  // Ensure club exists
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    return next(new AppError('Club not found', 404));
  }

  const parsedSeats = parseInt(totalSeats, 10);
  if (parsedSeats <= 0) {
    return next(new AppError('Total seats must be greater than 0', 400));
  }

  const event = await prisma.event.create({
    data: {
      clubId,
      title,
      description,
      venue,
      eventDate: new Date(eventDate),
      eventTime: eventTime ? new Date(`1970-01-01T${eventTime}`) : undefined,
      totalSeats: parsedSeats,
      remainingSeats: parsedSeats,
      status: 'active',
      createdById: req.user.id
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Event created successfully',
    data: event
  });
});

export const updateEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, venue, eventDate, eventTime, totalSeats, status } = req.body;

  const currentEvent = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } }
  });

  if (!currentEvent) {
    return next(new AppError('Event not found', 404));
  }

  const updatedData = {};
  if (title) updatedData.title = title;
  if (description) updatedData.description = description;
  if (venue) updatedData.venue = venue;
  if (eventDate) updatedData.eventDate = new Date(eventDate);
  if (eventTime) updatedData.eventTime = new Date(`1970-01-01T${eventTime}`);
  if (status) updatedData.status = status;

  if (totalSeats !== undefined) {
    const parsedSeats = parseInt(totalSeats, 10);
    const activeRegistrations = currentEvent._count.registrations;

    if (parsedSeats < activeRegistrations) {
      return next(new AppError(`Cannot reduce total capacity to ${parsedSeats}. There are already ${activeRegistrations} active registrations.`, 400));
    }

    updatedData.totalSeats = parsedSeats;
    updatedData.remainingSeats = parsedSeats - activeRegistrations;
  }

  const event = await prisma.event.update({
    where: { id },
    data: updatedData
  });

  res.status(200).json({
    status: 'success',
    message: 'Event updated successfully',
    data: event
  });
});

export const deleteEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id }
  });

  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  /* 
    CRITICAL DATABASE CASCADE RISK WARNING (FK ON DELETE CASCADE):
    The foreign key constraint in our DDL (registrations.event_id REFERENCES events(id) ON DELETE CASCADE)
    is configured to cascade. If we perform a hard DELETE on this event, PostgreSQL will silently and 
    irreversibly delete all corresponding registrations of students for this event. 
    To protect historical student registration audit logs, we must perform a soft-delete by setting the 
    event status to 'cancelled', keeping all relational audit records intact.
  */
  const softDeletedEvent = await prisma.event.update({
    where: { id },
    data: { status: 'cancelled' }
  });

  res.status(200).json({
    status: 'success',
    message: 'Event cancelled successfully (soft deleted)',
    data: softDeletedEvent
  });
});
