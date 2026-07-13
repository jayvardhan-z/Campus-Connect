import { pool } from '../config/db.js';
import AppError from '../utils/AppError.js';

export async function registerForEvent(eventId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Row lock: this SELECT ... FOR UPDATE blocks any other transaction from reading/modifying this
    // exact event row until this transaction commits or rolls back. This is what makes the seat
    // check-then-decrement sequence atomic under concurrency — without it, two transactions can both
    // read remaining_seats=1 before either writes, and both think they got the last seat.
    const { rows } = await client.query(
      'SELECT remaining_seats, status FROM events WHERE id = $1 FOR UPDATE', 
      [eventId]
    );
    
    if (!rows.length || rows[0].status !== 'active') {
      throw new AppError('Event not available', 400);
    }
    if (rows[0].remaining_seats <= 0) {
      throw new AppError('Event is full', 400);
    }

    // Duplicate registration check (also backed by the UNIQUE(event_id,user_id) constraint as a
    // second line of defense — catch 23505 below)
    const dup = await client.query(
      'SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2 AND status = $3',
      [eventId, userId, 'registered']
    );
    if (dup.rows.length) {
      throw new AppError('Already registered', 409);
    }

    // Insert registration record
    await client.query(
      'INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, $3)',
      [eventId, userId, 'registered']
    );
    
    // Decrement remaining seats
    await client.query(
      'UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = $1', 
      [eventId]
    );
    
    await client.query('COMMIT');
    return { success: true, message: 'Registered successfully' };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw new AppError('Already registered', 409);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelRegistration(eventId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Row lock the event row to check seat counts and update
    const { rows: eventRows } = await client.query(
      'SELECT id, remaining_seats, total_seats, status FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );

    if (!eventRows.length) {
      throw new AppError('Event not found', 404);
    }

    // Verify registration exists and is active
    const { rows: regRows } = await client.query(
      'SELECT id, status FROM registrations WHERE event_id = $1 AND user_id = $2 AND status = $3 FOR UPDATE',
      [eventId, userId, 'registered']
    );

    if (!regRows.length) {
      throw new AppError('No active registration found for this event', 404);
    }

    // Set registration status to cancelled
    await client.query(
      'UPDATE registrations SET status = $1 WHERE id = $2',
      ['cancelled', regRows[0].id]
    );

    // Increment remaining seats (up to total_seats limit)
    const newRemaining = Math.min(eventRows[0].remaining_seats + 1, eventRows[0].total_seats);
    await client.query(
      'UPDATE events SET remaining_seats = $1 WHERE id = $2',
      [newRemaining, eventId]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Registration cancelled successfully' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
