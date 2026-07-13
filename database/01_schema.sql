CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM TYPES DEFINITION
-- =============================================================================
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE event_status AS ENUM ('active', 'cancelled');
CREATE TYPE registration_status AS ENUM ('registered', 'cancelled');

-- =============================================================================
-- TABLES DEFINITION
-- =============================================================================

-- 1. Users Table (Core Auth & Account Table)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMPTZ,
    reset_password_token VARCHAR(255),
    reset_password_token_expires TIMESTAMPTZ,
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Student Profiles Table (1:1 with Users)
CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ON DELETE CASCADE: Deleting a student user account must delete their associated profile since it holds redundant and dependent demographic facts.
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    year_of_study SMALLINT CHECK (year_of_study BETWEEN 1 AND 6),
    phone VARCHAR(20),
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clubs Table
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ON DELETE CASCADE: Deleting a club must delete all of its scheduled events because events cannot exist in isolation without a hosting organization.
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    venue VARCHAR(255),
    event_date DATE NOT NULL,
    event_time TIME,
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    remaining_seats INTEGER NOT NULL CHECK (remaining_seats >= 0 AND remaining_seats <= total_seats),
    status event_status NOT NULL DEFAULT 'active',
    is_demo BOOLEAN NOT NULL DEFAULT false,
    -- ON DELETE SET NULL: Deleting the admin user who created the event retains the event in the catalog with creator set to null for attendance audit records.
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Registrations Table
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ON DELETE CASCADE: Deleting the event must purge the registration records since students cannot be registered for a non-existent event.
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    -- ON DELETE CASCADE: Deleting a user account must remove their active event sign-up registrations to release reserved seats and maintain audit safety.
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status registration_status NOT NULL DEFAULT 'registered',
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 6. Announcements Table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ON DELETE SET NULL: Deleting the poster's admin user account retains the announcement content for archives, marking the poster as NULL.
    posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    -- ON DELETE CASCADE: Deleting a club must cascade and delete its local announcements (can be NULL for system-wide/college-wide broadcasts).
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
