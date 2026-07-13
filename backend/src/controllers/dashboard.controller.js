import { pool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import paginate from '../utils/paginate.js';

/*
  NOTE ON RAW POOL USAGE FOR SQL VIEWS:
  Prisma Client does not support SQL views natively without defining custom model structures 
  or using workarounds like renaming schemas or database reflection, which adds unnecessary complexity.
  Querying the database views directly using the raw pg Pool is simpler, keeps the query interface 
  visible, and leverages high-performance PostgreSQL query planner optimizations directly.
*/

export const getUpcomingEvents = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  const countRes = await pool.query('SELECT COUNT(*) FROM upcoming_events_view');
  const total = parseInt(countRes.rows[0].count, 10);

  const dataRes = await pool.query(
    'SELECT * FROM upcoming_events_view LIMIT $1 OFFSET $2', 
    [limit, offset]
  );

  const result = paginate({ data: dataRes.rows, total, page, limit });

  res.status(200).json({
    status: 'success',
    ...result
  });
});

export const getMyRegistrations = asyncHandler(async (req, res, next) => {
  const { rows } = await pool.query(
    'SELECT * FROM student_registrations_view WHERE user_id = $1 ORDER BY registered_at DESC',
    [req.user.id]
  );

  res.status(200).json({
    status: 'success',
    data: rows
  });
});

export const getEventStats = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const { rows } = await pool.query(
    'SELECT * FROM event_statistics_view WHERE event_id = $1',
    [id]
  );

  if (!rows.length) {
    return next(new AppError('Event statistics not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: rows[0]
  });
});

export const getClubEvents = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const { rows } = await pool.query(
    'SELECT * FROM club_events_view WHERE club_id = $1 ORDER BY event_date ASC',
    [id]
  );

  res.status(200).json({
    status: 'success',
    data: rows
  });
});
