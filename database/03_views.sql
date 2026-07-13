-- =============================================================================
-- CAMPUS CONNECT SYSTEM - DATABASE VIEWS DEFINITION
-- =============================================================================

-- 1. Upcoming Events View
-- Purpose: Retrieves all active, upcoming events mapped to their hosting clubs
-- alongside their current active registration count.
CREATE OR REPLACE VIEW upcoming_events_view AS
SELECT 
    e.id AS event_id,
    e.title AS event_title,
    e.description AS event_description,
    e.venue,
    e.event_date,
    e.event_time,
    e.total_seats,
    e.remaining_seats,
    e.is_demo,
    c.id AS club_id,
    c.name AS club_name,
    c.category AS club_category,
    COUNT(r.id) FILTER (WHERE r.status = 'registered') AS registration_count
FROM events e
INNER JOIN clubs c ON e.club_id = c.id
LEFT JOIN registrations r ON e.id = r.event_id
WHERE e.status = 'active' 
  AND e.event_date >= CURRENT_DATE
GROUP BY e.id, c.id
ORDER BY e.event_date ASC;


-- 2. Student Registrations View
-- Purpose: Maps student user accounts to their active registrations, complete
-- with relevant event metadata (such as venue, timing, and club name).
CREATE OR REPLACE VIEW student_registrations_view AS
SELECT 
    r.id AS registration_id,
    r.user_id,
    r.status AS registration_status,
    r.registered_at,
    e.id AS event_id,
    e.title AS event_title,
    e.venue AS event_venue,
    e.event_date,
    e.event_time,
    c.name AS club_name
FROM registrations r
INNER JOIN events e ON r.event_id = e.id
INNER JOIN clubs c ON e.club_id = c.id;


-- 3. Event Statistics View
-- Purpose: Aggregates total registrations, cancellation counts, and seat fill
-- rate percentages for all events in the system.
CREATE OR REPLACE VIEW event_statistics_view AS
SELECT 
    e.id AS event_id,
    e.title AS event_title,
    c.name AS club_name,
    e.total_seats,
    e.remaining_seats,
    COUNT(r.id) FILTER (WHERE r.status = 'registered') AS active_registrations,
    COUNT(r.id) FILTER (WHERE r.status = 'cancelled') AS cancelled_registrations,
    ROUND(
        (COUNT(r.id) FILTER (WHERE r.status = 'registered')::NUMERIC / NULLIF(e.total_seats, 0)::NUMERIC) * 100.0, 
        2
    ) AS fill_rate_percentage
FROM events e
INNER JOIN clubs c ON e.club_id = c.id
LEFT JOIN registrations r ON e.id = r.event_id
GROUP BY e.id, c.name, e.total_seats, e.remaining_seats;


-- 4. Club Events View
-- Purpose: Lists all event metrics associated with specific clubs, utilizing 
-- window functions to partition club-level totals across rows.
CREATE OR REPLACE VIEW club_events_view AS
WITH event_regs AS (
    SELECT 
        e.id AS event_id,
        e.club_id,
        e.title AS event_title,
        e.event_date,
        e.status AS event_status,
        COUNT(r.id) FILTER (WHERE r.status = 'registered') AS event_registrations
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    GROUP BY e.id, e.club_id, e.title, e.event_date, e.status
)
SELECT 
    er.club_id,
    c.name AS club_name,
    er.event_id,
    er.event_title,
    er.event_date,
    er.event_status,
    er.event_registrations,
    SUM(er.event_registrations) OVER (PARTITION BY er.club_id) AS club_total_registrations,
    COUNT(er.event_id) OVER (PARTITION BY er.club_id) AS club_total_events
FROM event_regs er
INNER JOIN clubs c ON er.club_id = c.id;
