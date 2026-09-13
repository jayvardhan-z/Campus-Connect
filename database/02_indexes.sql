-- =============================================================================
-- CAMPUS CONNECT SYSTEM - DATABASE PERFORMANCE INDEXES
-- Note: users(email) and registrations(event_id, user_id) are automatically
-- indexed by PostgreSQL via their respective UNIQUE constraints.
-- =============================================================================

-- Indexes for event querying, filtering, and sorting
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_club_id ON events(club_id);
CREATE INDEX idx_events_status_date ON events(status, event_date);

-- Index for student registration lookups (student dashboard and history)
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
