-- =============================================================================
-- CAMPUS CONNECT SYSTEM - DATABASE QUERY LIBRARY
-- Demonstrating core SQL concepts and typical business operations
-- =============================================================================

-- =============================================================================
-- SECTION 1: Basic queries
-- =============================================================================

-- Q1: SELECT all upcoming events (event_date >= CURRENT_DATE)
-- Concept: Basic SELECT with Current Date comparison
-- Business question: Which active events are scheduled to happen on or after today?
SELECT id, title, event_date, event_time, venue, remaining_seats, status 
FROM events 
WHERE event_date >= CURRENT_DATE 
  AND status = 'active' 
ORDER BY event_date ASC;


-- Q2: INSERT a new registration (parameterized template, commented — not meant to run standalone)
-- Concept: Parameterized INSERT Statement
-- Business question: How do we record a new event registration for a student?
-- Note: This is a parameterized query template and is commented out so it does not fail when run as-is.
-- INSERT INTO registrations (event_id, user_id, status, registered_at) 
-- VALUES ('$1', '$2', 'registered', NOW());


-- Q3: UPDATE an event's remaining_seats (parameterized template)
-- Concept: Parameterized UPDATE Statement with safety bounds
-- Business question: How do we update the number of remaining seats for a specific event?
-- Note: This is a parameterized query template and is commented out so it does not fail when run as-is.
-- UPDATE events 
-- SET remaining_seats = remaining_seats - 1 
-- WHERE id = '$1' 
--   AND remaining_seats > 0 
--   AND status = 'active';


-- Q4: DELETE (soft) — UPDATE events SET status='cancelled' WHERE id = ...
-- Concept: Soft Delete via Status Update
-- Business question: How do we cancel/soft-delete an event without hard-deleting its registrations?
-- Note: This is a parameterized query template and is commented out so it does not fail when run as-is.
-- UPDATE events 
-- SET status = 'cancelled' 
-- WHERE id = '$1';


-- =============================================================================
-- SECTION 2: Filtering
-- =============================================================================

-- Q5: WHERE — events in a given department (via student registrations)
-- Concept: INNER JOIN with WHERE Filtering
-- Business question: Which events have attracted registrations from students in the 'Computer Science' department?
SELECT DISTINCT e.id, e.title, e.event_date, e.venue
FROM events e
INNER JOIN registrations r ON e.id = r.event_id
INNER JOIN student_profiles sp ON r.user_id = sp.user_id
WHERE sp.department = 'Computer Science' 
  AND r.status = 'registered'
ORDER BY e.event_date ASC;


-- Q6: LIKE — event titles matching a partial search string (ILIKE for case-insensitivity)
-- Concept: Case-Insensitive Pattern Matching (ILIKE)
-- Business question: What events contain the word 'hackathon' or 'workshop' in their title?
SELECT id, title, event_date, status 
FROM events 
WHERE title ILIKE '%hackathon%' 
   OR title ILIKE '%workshop%';


-- Q7: BETWEEN — events happening between two dates
-- Concept: Range Filtering using BETWEEN
-- Business question: Which events are scheduled during the first half of the academic year (e.g., between September 1, 2026 and December 31, 2026)?
SELECT id, title, event_date, venue 
FROM events 
WHERE event_date BETWEEN '2026-09-01'::DATE AND '2026-12-31'::DATE 
  AND status = 'active'
ORDER BY event_date ASC;


-- Q8: IN — events belonging to a given list of club categories
-- Concept: Set Membership Filtering using IN
-- Business question: Which active events are hosted by clubs matching the 'Technical', 'Coding', or 'Robotics' categories?
SELECT e.id, e.title, c.name AS club_name, c.category, e.event_date
FROM events e
INNER JOIN clubs c ON e.club_id = c.id
WHERE c.category IN ('Technical', 'Coding', 'Robotics') 
  AND e.status = 'active'
ORDER BY c.category, e.event_date ASC;


-- Q9: ORDER BY + LIMIT — 10 most recent events
-- Concept: Sorting and Pagination (ORDER BY and LIMIT)
-- Business question: What are the 10 most recently created events in the system?
SELECT id, title, created_at, status 
FROM events 
ORDER BY created_at DESC 
LIMIT 10;


-- =============================================================================
-- SECTION 3: Aggregate functions
-- =============================================================================

-- Q10: COUNT — number of students registered for each event (GROUP BY event_id)
-- Concept: Aggregate COUNT with GROUP BY
-- Business question: How many active student registrations does each event currently have?
SELECT event_id, COUNT(*) AS total_registrations
FROM registrations
WHERE status = 'registered'
GROUP BY event_id;


-- Q11: SUM — total seats offered across all of a club's events
-- Concept: Aggregate SUM with INNER JOIN
-- Business question: What is the total number of seats offered across all events hosted by each club?
SELECT c.id AS club_id, c.name AS club_name, SUM(e.total_seats) AS total_offered_seats
FROM clubs c
INNER JOIN events e ON c.id = e.club_id
WHERE e.status = 'active'
GROUP BY c.id, c.name
ORDER BY total_offered_seats DESC;


-- Q12: AVG — average remaining-seat percentage per club
-- Concept: Aggregate AVG with Expression Calculation
-- Business question: What is the average remaining seat percentage across active events for each club?
SELECT c.id AS club_id, c.name AS club_name, 
       ROUND(AVG((e.remaining_seats::NUMERIC / NULLIF(e.total_seats, 0)::NUMERIC) * 100.0), 2) AS avg_remaining_seat_percentage
FROM clubs c
INNER JOIN events e ON c.id = e.club_id
WHERE e.status = 'active'
GROUP BY c.id, c.name
ORDER BY avg_remaining_seat_percentage DESC;


-- Q13: MAX/MIN — the event with the most and the fewest registrations
-- Concept: Subqueries with Aggregate MAX and MIN
-- Business question: Which events have the absolute highest and lowest number of student registrations?
WITH registration_counts AS (
    SELECT e.id AS event_id, e.title, COUNT(r.id) AS reg_count
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
    GROUP BY e.id, e.title
)
SELECT event_id, title, reg_count, 'MAXIMUM' AS type
FROM registration_counts
WHERE reg_count = (SELECT MAX(reg_count) FROM registration_counts)
UNION ALL
SELECT event_id, title, reg_count, 'MINIMUM' AS type
FROM registration_counts
WHERE reg_count = (SELECT MIN(reg_count) FROM registration_counts);


-- =============================================================================
-- SECTION 4B: Subqueries
-- =============================================================================

-- Q16b: Subquery in WHERE (non-correlated)
-- Concept: Non-correlated Subquery in WHERE
-- Business question: Who are the students registered for the single most popular event?
SELECT u.email, sp.full_name
FROM registrations r 
JOIN users u ON u.id = r.user_id
JOIN student_profiles sp ON sp.user_id = u.id
WHERE r.event_id = (
  SELECT event_id FROM registrations
  GROUP BY event_id ORDER BY COUNT(*) DESC LIMIT 1
);
-- Comment: The inner query runs ONCE, independently of the outer query — that's what makes it
-- non-correlated. Contrast this explicitly with Q18 below.


-- Q17b: Subquery in SELECT (scalar subquery)
-- Concept: Scalar Subquery in SELECT
-- Business question: What is each event's title alongside its club's total event count?
SELECT e.title,
  (SELECT COUNT(*) FROM events e2 WHERE e2.club_id = e.club_id) AS club_total_events
FROM events e;
-- Comment: Contrast this with the equivalent JOIN + GROUP BY version (which would require
-- collapsing all of the club's other event rows) — the scalar subquery avoids that collapse
-- because it returns exactly one value per outer row without changing the row count of the
-- outer query.


-- Q18: Correlated subquery
-- Concept: Correlated Subquery
-- Business question: Which events have more registrations than their own club's average event registration count?
SELECT e.title, e.club_id,
  (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS this_event_regs
FROM events e
WHERE (
  SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id
) > (
  SELECT AVG(reg_count) FROM (
    SELECT COUNT(*) AS reg_count
    FROM registrations r2
    JOIN events e2 ON e2.id = r2.event_id
    WHERE e2.club_id = e.club_id
    GROUP BY r2.event_id
  ) club_avg
);
-- Comment: This subquery references e.club_id from the OUTER query, so it must be re-executed
-- once per outer row — that's the definition of "correlated." Note the performance
-- cost of this vs Q16b (non-correlated subqueries typically execute once; correlated subqueries
-- execute per row, which is why they're often rewritten as JOINs when possible — but this one is
-- a genuine case where nesting is clearer than the JOIN-based rewrite would be).


-- Q19b: EXISTS vs IN (EXISTS Version)
-- Concept: EXISTS Comparison
-- Business question: Which students have registered for at least one event in their own department's events (EXISTS version)?
SELECT sp.full_name FROM student_profiles sp
WHERE EXISTS (
  SELECT 1 FROM registrations r
  JOIN events e ON e.id = r.event_id
  WHERE r.user_id = sp.user_id
);


-- Q19b_alt: EXISTS vs IN (IN Version)
-- Concept: IN Comparison
-- Business question: Which students have registered for at least one event in their own department's events (IN version)?
SELECT sp.full_name FROM student_profiles sp
WHERE sp.user_id IN (
  SELECT r.user_id FROM registrations r
);
-- Comment: EXISTS stops scanning as soon as it finds one match (short-circuits); IN materializes
-- the full subquery result set first. For large subquery result sets EXISTS is typically faster —
-- this is the query actually used in Prompt 14's department filter, so it's worth being able to
-- explain the choice.


-- =============================================================================
-- SECTION 4: GROUP BY / HAVING / DISTINCT
-- =============================================================================

-- Q14: GROUP BY — registrations per event, joined to event title
-- Concept: GROUP BY with Multi-Table Joins
-- Business question: What are the registration counts for each event, listed with the event title and club name?
SELECT e.id AS event_id, e.title AS event_title, c.name AS club_name, COUNT(r.id) AS registration_count
FROM events e
INNER JOIN clubs c ON e.club_id = c.id
LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
GROUP BY e.id, e.title, c.name
ORDER BY registration_count DESC;


-- Q15: HAVING — events with more than 20 registrations (your plan's exact example)
-- Concept: Filtering Aggregated Groups using HAVING
-- Business question: Which events have accumulated more than 20 active registrations?
SELECT e.id AS event_id, e.title AS event_title, COUNT(r.id) AS registration_count
FROM events e
INNER JOIN registrations r ON e.id = r.event_id
WHERE r.status = 'registered'
GROUP BY e.id, e.title
HAVING COUNT(r.id) > 20
ORDER BY registration_count DESC;


-- Q16: DISTINCT — departments participating in at least one event (JOIN student_profiles → registrations)
-- Concept: DISTINCT Multi-Table Joining
-- Business question: What are the unique academic departments that have at least one student registered for an active event?
SELECT DISTINCT sp.department
FROM student_profiles sp
INNER JOIN registrations r ON sp.user_id = r.user_id
INNER JOIN events e ON r.event_id = e.id
WHERE r.status = 'registered' 
  AND e.status = 'active' 
  AND sp.department IS NOT NULL
ORDER BY sp.department ASC;


-- =============================================================================
-- SECTION 5: Joins
-- =============================================================================

-- Q17: INNER JOIN
-- Concept: Multi-table INNER JOIN
-- Business question: Which students are registered for which events, including the hosting club and registration status?
SELECT sp.full_name AS student_name, e.title AS event_title, c.name AS club_name, r.status AS registration_status
FROM registrations r
INNER JOIN users u ON r.user_id = u.id
INNER JOIN student_profiles sp ON u.id = sp.user_id
INNER JOIN events e ON r.event_id = e.id
INNER JOIN clubs c ON e.club_id = c.id;


-- Q18: LEFT JOIN
-- Concept: LEFT OUTER JOIN with NULL Filtering (Anti-Join)
-- Business question: Which events currently have zero student registrations?
SELECT e.id AS event_id, e.title AS event_title, e.event_date
FROM events e
LEFT JOIN registrations r ON e.id = r.event_id
WHERE r.id IS NULL;
-- Comment: An INNER JOIN could never answer this question because it only returns rows
-- that have matching records in both tables. Since we are looking for events with NO
-- registrations, an INNER JOIN would exclude exactly the rows we want to find.


-- Q19: RIGHT JOIN
-- Concept: RIGHT OUTER JOIN
-- Business question: What is the list of all clubs and their scheduled events, including clubs that have not hosted any events yet?
SELECT c.name AS club_name, e.title AS event_title, e.event_date
FROM events e
RIGHT JOIN clubs c ON e.club_id = c.id
ORDER BY c.name ASC;
-- Comment: Written as a RIGHT JOIN with clubs on the right side to demonstrate the syntax.
-- This ensures all clubs are returned even if they have no matching events. This is equivalent 
-- to a LEFT JOIN with table order swapped (clubs LEFT JOIN events).


-- =============================================================================
-- BONUS: Comparing JOIN Types Side-by-Side
-- =============================================================================
-- To understand how INNER, LEFT, and RIGHT joins affect row counts, compare these queries:
--
-- 1. INNER JOIN (Only returns events that have registrations)
--    SELECT e.title, r.id 
--    FROM events e 
--    INNER JOIN registrations r ON e.id = r.event_id;
--
-- 2. LEFT JOIN (Returns ALL events, showing NULL for registrations if none exist)
--    SELECT e.title, r.id 
--    FROM events e 
--    LEFT JOIN registrations r ON e.id = r.event_id;
--
-- 3. RIGHT JOIN (Returns ALL registrations, showing NULL for event details if the event is missing)
--    SELECT e.title, r.id 
--    FROM events e 
--    RIGHT JOIN registrations r ON e.id = r.event_id;

