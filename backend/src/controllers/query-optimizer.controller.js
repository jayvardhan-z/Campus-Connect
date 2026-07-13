import { pool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/*
  CRITICAL SECURITY NOTE ON SQL INJECTION PREVENTION:
  We NEVER accept raw SQL input from the client to run EXPLAIN ANALYZE.
  EXPLAIN ANALYZE actually EXECUTES the query. Accepting raw SQL would allow 
  unauthenticated/malicious actors to perform arbitrary DDL or DML (e.g. INSERT, 
  UPDATE, DELETE) under the guise of an explain statement.
  Instead, we use a strict whitelist of pre-defined queries.
*/

const queryWhitelist = {
  upcoming_events: {
    sql: 'SELECT * FROM upcoming_events_view',
    params: [],
    indexesToDrop: ['idx_events_status_date', 'idx_events_event_date']
  },
  my_registrations: {
    sql: 'SELECT * FROM student_registrations_view WHERE user_id = $1::uuid',
    params: ['00000000-0000-0000-0000-000000000000'],
    indexesToDrop: ['idx_registrations_user_id']
  },
  event_lookup_by_email: {
    sql: 'SELECT * FROM users WHERE email = $1',
    params: ['explain_test@college.edu'],
    indexesToDrop: ['idx_users_email']
  }
};

export const explainQuery = asyncHandler(async (req, res, next) => {
  const { query } = req.query;

  if (!query || !queryWhitelist[query]) {
    return next(new AppError('Invalid or missing query name in whitelist', 400));
  }

  const { sql, params, indexesToDrop } = queryWhitelist[query];
  
  const client = await pool.connect();
  try {
    // 1. Run WITH INDEX (Normally)
    const withIndexRes = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, params);
    let withIndexPlan = withIndexRes.rows[0]['QUERY PLAN'];
    if (typeof withIndexPlan === 'string') {
      withIndexPlan = JSON.parse(withIndexPlan);
    }
    const withPlanSummary = withIndexPlan[0]['Plan']['Node Type'];
    const withTime = withIndexPlan[0]['Execution Time'];

    // 2. Run WITHOUT INDEX (Inside a transaction that rolls back)
    await client.query('BEGIN');
    for (const idx of indexesToDrop) {
      await client.query(`DROP INDEX IF EXISTS ${idx}`);
    }
    const withoutIndexRes = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, params);
    await client.query('ROLLBACK');

    let withoutIndexPlan = withoutIndexRes.rows[0]['QUERY PLAN'];
    if (typeof withoutIndexPlan === 'string') {
      withoutIndexPlan = JSON.parse(withoutIndexPlan);
    }
    const withoutPlanSummary = withoutIndexPlan[0]['Plan']['Node Type'];
    const withoutTime = withoutIndexPlan[0]['Execution Time'];

    // Calculate speedup
    const ratio = withoutTime / (withTime || 0.001);
    const speedup = `${ratio.toFixed(1)}x faster`;

    res.status(200).json({
      status: 'success',
      query,
      sql,
      withoutIndex: {
        planSummary: withoutPlanSummary,
        executionTimeMs: withoutTime
      },
      withIndex: {
        planSummary: withPlanSummary,
        executionTimeMs: withTime
      },
      speedup
    });

  } catch (err) {
    // Safety check to release transaction if error occurs mid-way
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
});
