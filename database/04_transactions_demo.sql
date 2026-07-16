-- =========================================================================
-- Campus Connect System — Concurrency & Transaction Isolation Demo Scripts
-- =========================================================================
-- This file contains SQL walkthroughs to study or simulate database transactions,
-- row-locking (Pessimistic Locking), and transaction isolation levels.
-- You can run these step-by-step in two separate database sessions (e.g., two psql
-- terminals or two query tabs in pgAdmin) to observe PostgreSQL's concurrency engine.

-----------------------------------------------------------------------------
-- DEMO 1: Pessimistic Row-Locking (SELECT ... FOR UPDATE)
-- Objective: Show how FOR UPDATE locks a row to prevent double-booking.
-----------------------------------------------------------------------------

-- Preparations: Let's assume an event with ID 'e1' has 1 remaining seat.
-- UPDATE events SET remaining_seats = 1 WHERE id = 'e1';

-- [SESSION 1]
BEGIN;
-- Select the event and acquire a Row Share Lock on it
SELECT title, remaining_seats, status 
FROM events 
WHERE id = 'e1' 
FOR UPDATE;
-- (Session 1 reads remaining_seats = 1. The row is now locked.)

-- [SESSION 2] (Run this in a separate terminal while Session 1 is open)
BEGIN;
SELECT title, remaining_seats, status 
FROM events 
WHERE id = 'e1' 
FOR UPDATE;
-- >>> OBSERVATION: Session 2 BLOCKS and hangs. 
-- It is waiting for Session 1 to release the lock.

-- [SESSION 1]
-- Session 1 proceeds with the registration and decrements the seat count.
INSERT INTO registrations (event_id, user_id, status) 
VALUES ('e1', 'u1', 'registered');

UPDATE events 
SET remaining_seats = remaining_seats - 1 
WHERE id = 'e1';

COMMIT;
-- >>> OBSERVATION: As soon as Session 1 commits, Session 2 unblocks.
-- Since Session 2 was blocked on SELECT FOR UPDATE, it now reads the UPDATED value:
-- remaining_seats = 0.
-- Session 2's application logic sees remaining_seats <= 0, errors out, and rolls back:
-- ROLLBACK;


-----------------------------------------------------------------------------
-- DEMO 2: Read Committed Isolation (The Overbooking Race Condition)
-- Objective: Show why standard READ COMMITTED fails without FOR UPDATE.
-----------------------------------------------------------------------------

-- Reset:
-- UPDATE events SET remaining_seats = 1 WHERE id = 'e1';

-- [SESSION 1]
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT remaining_seats FROM events WHERE id = 'e1';
-- Reads remaining_seats = 1

-- [SESSION 2]
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT remaining_seats FROM events WHERE id = 'e1';
-- Also reads remaining_seats = 1 (No row lock is active)

-- [SESSION 1]
INSERT INTO registrations (event_id, user_id) VALUES ('e1', 'u1');
UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = 'e1';
COMMIT;

-- [SESSION 2]
-- Session 2 does not know Session 1 changed the data because it checked capacity earlier.
INSERT INTO registrations (event_id, user_id) VALUES ('e1', 'u2');
UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = 'e1';
COMMIT;
-- >>> OBSERVATION: Both bookings succeed! Remaining seats is now -1 (OVERBOOKED).


-----------------------------------------------------------------------------
-- DEMO 3: Serializable Isolation (Automatic Conflict Detection)
-- Objective: Show how SERIALIZABLE guarantees safety by throwing serialization errors.
-----------------------------------------------------------------------------

-- Reset:
-- UPDATE events SET remaining_seats = 1 WHERE id = 'e1';
-- DELETE FROM registrations WHERE event_id = 'e1';

-- [SESSION 1]
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT remaining_seats FROM events WHERE id = 'e1'; -- Reads 1

-- [SESSION 2]
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT remaining_seats FROM events WHERE id = 'e1'; -- Reads 1

-- [SESSION 1]
INSERT INTO registrations (event_id, user_id) VALUES ('e1', 'u1');
UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = 'e1';
COMMIT; -- Session 1 succeeds

-- [SESSION 2]
INSERT INTO registrations (event_id, user_id) VALUES ('e1', 'u2');
UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = 'e1';
-- >>> OBSERVATION: Running the UPDATE statement in Session 2 immediately throws:
-- ERROR: could not serialize access due to concurrent update
-- SQLState: 40001
--
-- Session 2 must be aborted and retried:
ROLLBACK;
