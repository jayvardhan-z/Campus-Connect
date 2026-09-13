import { pool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

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
