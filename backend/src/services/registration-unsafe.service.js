import { pool } from '../config/db.js';

export async function registerForEventUnsafe(eventId, userId) {
  // Deliberately broken: no FOR UPDATE, and a small artificial delay between the read and the write
  // to make the race condition reliably reproducible instead of a rare flake in a live demo.
  const { rows } = await pool.query('SELECT remaining_seats, status FROM events WHERE id=$1', [eventId]);
  if (!rows.length || rows[0].remaining_seats <= 0) return { success: false, message: 'Full' };
  
  await new Promise(r => setTimeout(r, 300));   // widens the race window on purpose
  
  await pool.query('INSERT INTO registrations (event_id, user_id, status) VALUES ($1,$2,$3)',
    [eventId, userId, 'registered']);
  await pool.query('UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id=$1', [eventId]);
  
  return { success: true, message: 'Registered (unsafe path)' };
}
