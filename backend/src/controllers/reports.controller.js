import { pool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getStudentSummary = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const [upcomingRes, myRegsRes, announcementsRes, totalRegsRes] = await Promise.all([
    pool.query('SELECT * FROM upcoming_events_view LIMIT 5'),
    pool.query(
      'SELECT * FROM student_registrations_view WHERE user_id = $1 AND registration_status = $2 ORDER BY registered_at DESC LIMIT 5',
      [userId, 'registered']
    ),
    pool.query(
      'SELECT a.*, c.name AS club_name FROM announcements a LEFT JOIN clubs c ON a.club_id = c.id ORDER BY a.created_at DESC LIMIT 5'
    ),
    pool.query(
      'SELECT COUNT(*)::INTEGER AS count FROM registrations WHERE user_id = $1 AND status = $2',
      [userId, 'registered']
    )
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      upcomingEvents: upcomingRes.rows,
      myRegistrations: myRegsRes.rows,
      recentAnnouncements: announcementsRes.rows,
      totalRegisteredCount: totalRegsRes.rows[0].count
    }
  });
});

export const getAdminSummary = asyncHandler(async (req, res, next) => {
  const [countsRes, popularRes, monthlyRes] = await Promise.all([
    pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM student_profiles)::INTEGER AS total_students,
        (SELECT COUNT(*) FROM clubs)::INTEGER AS total_clubs,
        (SELECT COUNT(*) FROM events)::INTEGER AS total_events,
        (SELECT COUNT(*) FROM registrations WHERE status = 'registered')::INTEGER AS total_registrations
    `),
    pool.query(
      'SELECT * FROM event_statistics_view ORDER BY active_registrations DESC LIMIT 1'
    ),
    pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', registered_at), 'YYYY-MM') AS month,
        COUNT(*)::INTEGER AS count
      FROM registrations
      WHERE status = 'registered'
        AND registered_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', registered_at)
      ORDER BY month DESC
    `)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      metrics: countsRes.rows[0],
      mostPopularEvent: popularRes.rows[0] || null,
      monthlyRegistrationStats: monthlyRes.rows
    }
  });
});
