-- Indexes for optimized user lookup and authentication
CREATE INDEX idx_users_email ON users(email);

-- Indexes for event querying and filtering
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_club_id ON events(club_id);

-- Indexes for registration lookups (student history and event roster checks)
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_event_id ON registrations(event_id);

-- Composite index to support natural composite UNIQUE constraint lookup pathway
CREATE INDEX idx_registrations_composite ON registrations(event_id, user_id);

-- Composite index to support event list filtering and sorting by status and date
CREATE INDEX idx_events_status_date ON events(status, event_date);
