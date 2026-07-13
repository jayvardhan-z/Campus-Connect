# Campus Connect System — Technical Documentation

This documentation serves as the comprehensive system reference manual for the Campus Connect System, compiling the database architecture, transactional safeguards, query performance optimizations, API endpoints, and system setup guide.

---

## 1. Software Requirement Specification (SRS)

### 1.1 System Overview
Campus Connect is a high-performance web application designed for a college campus environment to coordinate and manage student club events, event registration catalogs, announcements, and participation metrics. The system implements a strict role-based access control model separating **Students** and **Admins**.

### 1.2 Functional Requirements

#### Student Functional Requirements
| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| **SF-01** | Register | Create a student account (name, email, password, department, year). Requires email verification before activation. | **High** |
| **SF-02** | Login | Authenticate with email/password to retrieve JWT access & refresh tokens. | **High** |
| **SF-03** | View Events (List) | Browse paginated list of upcoming events with date range, category, department filters, and sort options (latest, oldest, popular). | **High** |
| **SF-04** | View Event (Detail) | View event description, venue, date/time, and real-time remaining seat capacity. | **High** |
| **SF-05** | Register for Event | Enroll in an active event if capacity remains. Handled safely under concurrent traffic. | **High** |
| **SF-06** | Cancel Registration | Cancel active enrollment. Frees seat immediately and updates statistics. | **Medium** |
| **SF-07** | View Registered Events | View personalized registry of upcoming and past events. | **Medium** |
| **SF-08** | Update Profile | Modify full name, phone, bio, department, and study year. | **Low** |

#### Admin Functional Requirements
| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| **AF-01** | Login | Admin authenticates via pre-seeded credentials. No self-registration is allowed. | **High** |
| **AF-02** | Create Event | Create event listings with name, capacity, deadline, venue, and organizing club. | **High** |
| **AF-03** | Update Event | Edit event details. Restricts capacity reductions below current participant counts. | **High** |
| **AF-04** | Delete Event | Soft-delete events by setting `status = 'cancelled'`. Retains records for analytical views. | **Medium** |
| **AF-05** | View Participants | Inspect the full student directory registered for an event. | **High** |
| **AF-06** | Post Announcement | Broadcast notices scoped to specific clubs or globally. | **Medium** |
| **AF-07** | Dashboard | Display total students, clubs, events, registrations, popular events, and registration trends. | **Medium** |

### 1.3 Non-Functional Requirements
- **Performance**: Simple reads $\le$ 200 ms, list filters $\le$ 500 ms, transaction writes $\le$ 300 ms.
- **Security**: Passwords hashed using `bcrypt` (10 rounds). RBAC enforced at the API route layer. Parameterized queries for SQL injection defense.
- **Data Integrity**: Unique emails, compound unique constraint on `(event_id, user_id)` registrations, non-negative capacity check, referential integrity.
- **Concurrency**: Absolute ACID guarantees during event registration to prevent double booking.

---

## 2. Entity-Relationship (ER) Diagram

The ER design is mapped using crow's-foot notation below.

```text
       +-----------------------+
       |         User          |
       +-----------------------+
         |                 |
         |o                || (posted_by)
         |                 |
       (1:1)             (1:N)
         |                 |
         ||                o<
         |                 |
  +--------------+   +--------------+
  |StudentProfile|   | Announcement |
  +--------------+   +--------------+
         |
         || (has)
         |
       (1:N)
         |
         o<
         |
  +--------------+
  | Registration |
  +--------------+
         |
         o<
         |
       (N:1)
         |
         || (for)
         |
       +--------------+                    +--------------+
       |    Event     | o<──────(N:1)──────||     Club     |
       +--------------+                    +--------------+
```

---

## 3. Relational Schema (Final, 3NF Normalized)

The database schema is fully normalized into 3NF. All tables are defined below:

```text
User (
    id UUID PK,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE
)

StudentProfile (
    id UUID PK,
    user_id UUID FK -> User(id) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    year_of_study INT NOT NULL CHECK (year_of_study BETWEEN 1 AND 4),
    phone VARCHAR(20) NULL,
    bio TEXT NULL
)

Club (
    id UUID PK,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL
)

Event (
    id UUID PK,
    club_id UUID FK -> Club(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    venue VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NULL,
    total_seats INT NOT NULL CHECK (total_seats > 0),
    remaining_seats INT NOT NULL CHECK (remaining_seats >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    is_demo BOOLEAN DEFAULT FALSE,
    created_by UUID FK -> User(id) NOT NULL
)

Registration (
    id UUID PK,
    event_id UUID FK -> Event(id) NOT NULL,
    user_id UUID FK -> User(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
)

Announcement (
    id UUID PK,
    posted_by UUID FK -> User(id) NOT NULL,
    club_id UUID FK -> Club(id) NULL, -- NULL indicates global broadcast
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

## 4. Normalization Proof (1NF / 2NF / 3NF)

### 4.1 Functional Dependencies (FDs)
* **User**: `id` $\rightarrow$ `email`, `password_hash`, `role`, `is_verified`
* **StudentProfile**: `id` $\rightarrow$ `user_id`, `full_name`, `department`, `year_of_study`, `phone`, `bio`
* **Club**: `id` $\rightarrow$ `name`, `description`, `category`
* **Event**: `id` $\rightarrow$ `club_id`, `title`, `description`, `venue`, `event_date`, `event_time`, `total_seats`, `remaining_seats`, `status`, `created_by`
* **Registration**: `id` $\rightarrow$ `event_id`, `user_id`, `status`, `registered_at`; `(event_id, user_id)` $\rightarrow$ `id`, `status`, `registered_at`
* **Announcement**: `id` $\rightarrow$ `posted_by`, `club_id`, `title`, `content`

### 4.2 First Normal Form (1NF) Proof
- **Rule**: A table is in 1NF if and only if the domain of each attribute contains only atomic (indivisible) values, and there are no repeating groups.
- **Before Fix Violation**: The original student schema contained a `registered_events` field on the student profile table storing a comma-separated string of event IDs (e.g. `"Event-01, Event-02"`). This is a multi-valued repeating group.
- **Proof of Correction**: The repeating list is completely decomposed. The student profile now contains only single-valued demographic attributes (`full_name`, `department`, etc.). Events registrations are mapped as individual, atomic tuples in the associative `Registration` table, satisfying 1NF.

### 4.3 Second Normal Form (2NF) Proof
- **Rule**: A table is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key (no partial dependencies).
- **Before Fix Violation**: In the draft registration table with composite key `(event_id, user_id)`, the fields `event_title` and `club_name` were stored. Since `event_id` $\rightarrow$ `event_title`, `event_title` was partially dependent on only part of the key.
- **Proof of Correction**: All partial dependencies have been removed. The `Registration` table stores only `event_id`, `user_id`, `status`, and `registered_at`. Attributes such as `event_title` and `club_name` have been relocated to their home tables (`Event` and `Club`) where they depend fully on the singular primary keys, satisfying 2NF.

### 4.4 Third Normal Form (3NF) Proof
- **Rule**: A table is in 3NF if it is in 2NF and there is no transitive dependency for non-prime attributes. That is, no non-prime attribute determines another non-prime attribute.
- **Before Fix Violation**: The `Event` table originally stored `club_name` and `club_category` alongside `club_id`. The dependencies were: `event_id` $\rightarrow$ `club_id` $\rightarrow$ `club_name`/`club_category`. Since `club_id` is a non-prime attribute, this represents a transitive dependency.
- **Proof of Correction**: The transitive columns `club_name` and `club_category` were removed from the `Event` table. The `Event` table now contains only `club_id` as a foreign key reference. The metadata details are queried by joining with the `Club` table on demand. Thus, all non-prime attributes depend only on the key, the whole key, and nothing but the key, satisfying 3NF.

---

## 5. Database Schema Reference

- Core Database Schema: [database/01_schema.sql](../database/01_schema.sql)
- Optimization Indexes: [database/02_indexes.sql](../database/02_indexes.sql)

---

## 6. SQL Queries Used

The SQL query library is fully documented in [database/05_query_library.sql](../database/05_query_library.sql). Key queries grouped by business question sections include:

- **Section 1: Basic Operations**
  - Q1: Select upcoming events:
    ```sql
    SELECT * FROM events WHERE event_date >= CURRENT_DATE AND status = 'active';
    ```
- **Section 2: Multi-Criteria Filtering**
  - Q5: Events in a student's department via registrants:
    ```sql
    SELECT DISTINCT e.* FROM events e
    JOIN registrations r ON r.event_id = e.id
    JOIN student_profiles sp ON sp.user_id = r.user_id
    WHERE sp.department = $1;
    ```
- **Section 4B: Subqueries (Nested & Correlated)**
  - Q16b: Find students registered for the single most popular event (non-correlated):
    ```sql
    SELECT u.email, sp.full_name
    FROM registrations r 
    JOIN users u ON u.id = r.user_id
    JOIN student_profiles sp ON sp.user_id = u.id
    WHERE r.event_id = (
      SELECT event_id FROM registrations
      GROUP BY event_id ORDER BY COUNT(*) DESC LIMIT 1
    );
    ```
- **Section 5: Joins**
  - Q17: Inner join returning registrant name, event title, club name:
    ```sql
    SELECT sp.full_name, e.title, c.name AS club_name, r.status
    FROM registrations r
    JOIN users u ON u.id = r.user_id
    JOIN student_profiles sp ON sp.user_id = u.id
    JOIN events e ON e.id = r.event_id
    JOIN clubs c ON c.id = e.club_id;
    ```
  - Q18: Left Join identifying events without registrations:
    ```sql
    SELECT e.title, e.event_date
    FROM events e
    LEFT JOIN registrations r ON r.event_id = e.id
    WHERE r.id IS NULL;
    ```

---

## 7. Views Reference

Persistent views are configured in [database/03_views.sql](../database/03_views.sql) to decouple complex analytical aggregations from the query controllers:

1. `upcoming_events_view`: Selects active upcoming events joined to their organizing clubs and performs a left join grouping to count current active registrations.
2. `student_registrations_view`: Aggregates active student registrations, returning event details, venue, dates, and status for student dashboard feeds.
3. `event_statistics_view`: Evaluates registration counts, cancellations, and the overall capacity fill rate:
   ```sql
   CREATE VIEW event_statistics_view AS
   SELECT 
     e.id AS event_id,
     e.title AS event_title,
     c.name AS club_name,
     COUNT(CASE WHEN r.status = 'registered' THEN 1 END) AS active_registrations,
     COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) AS cancellations,
     e.total_seats,
     ROUND(COUNT(CASE WHEN r.status = 'registered' THEN 1 END)::numeric / e.total_seats, 4) AS fill_rate
   FROM events e
   JOIN clubs c ON c.id = e.club_id
   LEFT JOIN registrations r ON r.event_id = e.id
   GROUP BY e.id, e.title, c.name, e.total_seats;
   ```
4. `club_events_view`: Shows club-specific events summary with total seats, registration counts, and aggregate counts per club.

---

## 8. Transactions & Concurrency Control

### 8.1 The Race Condition
In a standard multi-user system, event registration operates in a check-then-write sequence:
1. `SELECT remaining_seats FROM events WHERE id = $1;`
2. If `remaining_seats > 0`, proceed to write.
3. `INSERT INTO registrations (event_id, user_id);`
4. `UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = $1;`

If an event has exactly **1 seat remaining** and two transactions (`TxA` and `TxB`) execute Step 1 at the same millisecond under normal `READ COMMITTED` isolation, both read `remaining_seats = 1`. Both evaluate the check as successful, insert a registration, and update the seats. The seat count drops to `-1` (negative), resulting in **overbooking (double booking)**. This violates the ACID consistency guarantee.

### 8.2 The Pessimistic Row-Locking Fix (`FOR UPDATE`)
To make this operation atomic, we introduce **Pessimistic Locking**. In PostgreSQL, the `SELECT ... FOR UPDATE` clause locks the returned rows. If `TxA` calls `SELECT ... FOR UPDATE`, any subsequent transaction (`TxB`) trying to read or write to that specific event row is blocked and placed in a queue.

```javascript
// From: backend/src/services/registration.service.js
await client.query('BEGIN');
const { rows } = await client.query(
  'SELECT remaining_seats, status FROM events WHERE id = $1 FOR UPDATE', 
  [eventId]
);
// TxB blocks here until TxA calls COMMIT or ROLLBACK.
```

Once `TxA` commits, `remaining_seats` drops to `0`. When `TxB` is finally allowed to proceed, its `SELECT FOR UPDATE` reads the *updated* seat count (`0`), fails the validation, and rolls back safely.

### 8.3 The Isolation-Level Alternative (`SERIALIZABLE`)
Instead of explicit locks, we can set the transaction isolation level to `SERIALIZABLE`:
```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```
Under this level, PostgreSQL monitors concurrent transactions. If `TxA` and `TxB` read the same event row and both try to write updates, PostgreSQL detects a serialization conflict. It allows one transaction to commit, while immediately terminating the other with a **Serialization Failure (SQLState 40001)**. The application must catch this error and retry the transaction.

### 8.4 Live Lab Simulation Outcomes

Here is the exact terminal results generated during a simulation run against the pre-seeded demo event (resetting capacity to 1 seat, firing 5 concurrent student registrations):

#### Concurrency Simulation (Safe vs. Unsafe)
* **Unsafe Execution (No Row Lock)**:
  - Fired: `5 concurrent requests`
  - Successes: `5`
  - Failures: `0`
  - Final Remaining Seats: `-4` (State: **OVERBOOKED / BUGGED**)
* **Safe Execution (SELECT FOR UPDATE)**:
  - Fired: `5 concurrent requests`
  - Successes: `1`
  - Failures: `4` (Transaction rolled back)
  - Final Remaining Seats: `0` (State: **SAFE / CONSISTENT**)

#### Isolation Level Simulation (READ COMMITTED vs. SERIALIZABLE)
* **READ COMMITTED**:
  - Fired: `3 concurrent requests`
  - Successful Bookings: `3` (State: **OVERBOOKED** due to dirty/uncommitted read-to-write race windows)
* **SERIALIZABLE**:
  - Fired: `3 concurrent requests`
  - Successful Bookings: `1`
  - Serialization Failures (Code 40001): `2` (State: **SAFE**; database rolled back conflicts automatically)

---

## 9. Indexing & Query Benchmarking

Performance timing results collected via database EXPLAIN plan analysis on a seeded database (806 users, 120 events, 1,978 registrations):

| Scenario / Query | Plan Without Index | Plan With Index | Execution Time (No Index) | Execution Time (Indexed) | Speedup Factor |
|:---|:---|:---|:---|:---|:---|
| **Upcoming Events Feed** <br>`SELECT * FROM upcoming_events_view;` | `Seq Scan on events` | `Seq Scan on events` | 1.385 ms | 0.922 ms | **1.5x** |
| **Student Registrations** <br>`SELECT * FROM student_registrations_view WHERE user_id = $1;` | `Seq Scan on registrations` | `Bitmap Index Scan on idx_registrations_user_id` | 0.413 ms | 0.202 ms | **2.0x** |
| **Account Email Lookup** <br>`SELECT * FROM users WHERE email = $1;` | `Seq Scan on users` | `Index Scan using idx_users_email` | 0.098 ms | 0.045 ms | **2.2x** |

---

## 10. API Reference Documentation

All endpoints require JSON payloads. JWT tokens must be sent via the `Authorization: Bearer <token>` header.

| Method | Route | Auth Required | Role Required | Description |
|:---|:---|:---|:---|:---|
| **POST** | `/api/auth/register` | No | None | Registers a student user profile |
| **GET** | `/api/auth/verify-email` | No | None | Verifies email using verification token |
| **POST** | `/api/auth/login` | No | None | Authenticates user; returns access + refresh tokens |
| **POST** | `/api/auth/logout` | No | None | Clears active cookie tokens |
| **POST** | `/api/auth/refresh` | No | None | Rotates refresh token to issue new access token |
| **GET** | `/api/auth/me` | Yes | Any | Returns authenticated user profile |
| **GET** | `/api/students/profile` | Yes | `student` | Retrieves active student profile information |
| **PUT** | `/api/students/profile` | Yes | `student` | Updates student profile demographic parameters |
| **GET** | `/api/events` | Yes | Any | Query/filter events list (paginated, sorted) |
| **GET** | `/api/events/:id` | Yes | Any | Retrieve event information |
| **POST** | `/api/events` | Yes | `admin` | Creates new event listing |
| **PUT** | `/api/events/:id` | Yes | `admin` | Updates existing event |
| **DELETE** | `/api/events/:id` | Yes | `admin` | Soft-deletes / cancels event listing |
| **POST** | `/api/registrations/:eventId` | Yes | `student` | Safe atomic event registration |
| **DELETE** | `/api/registrations/:eventId` | Yes | `student` | Cancels event registration and updates capacity |
| **GET** | `/api/registrations/event/:eventId` | Yes | `admin` | Returns participant directory list for an event |
| **GET** | `/api/announcements` | Yes | Any | Retrieves announcements bulletin board feed |
| **POST** | `/api/announcements` | Yes | `admin` | Posts new announcement |
| **DELETE** | `/api/announcements/:id` | Yes | `admin` | Deletes/withdraws active announcement |
| **GET** | `/api/reports/student-summary` | Yes | `student` | Retrieves student dashboard summary metrics |
| **GET** | `/api/reports/admin-summary` | Yes | `admin` | Retrieves admin dashboard statistics |
| **GET** | `/api/admin/explain` | Yes | `admin` | Runs EXPLAIN ANALYZE index comparison lab |
| **POST** | `/api/concurrency-lab/simulate` | Yes | `admin` | Runs safe/unsafe concurrency simulation tests |
| **GET** | `/api/concurrency-lab/isolation-demo` | Yes | `admin` | Runs isolation level simulation tests |

---

## 11. Screenshots Placeholder Section

Screenshots proving interface capabilities are captured and stored in `docs/screenshots/`. Below is the directory mapping for screenshots required during final evaluation:

1. **Student Module**:
   - `01_login_page.png`: Student authentication page.
   - `02_registration_page.png`: Student onboarding details form.
   - `03_student_dashboard.png`: Displays registered events count, my registrations, and announcements.
   - `04_events_catalog.png`: Events search marketplace showing pagination, sorting, and category filters.
   - `05_event_details.png`: Showing register button and remaining seats indicator.
   - `06_profile_settings.png`: Showing personal edit profile forms.
2. **Admin Module**:
   - `07_admin_dashboard.png`: Dashboard showing database counters and Recharts trend lines.
   - `08_events_database_crud.png`: Event management control center.
   - `09_event_participants.png`: Roster table of registered students.
   - `10_concurrency_lab.png`: Shows Unsafe (Overbooked) vs. Safe (Consistent) outcomes.
   - `11_query_optimizer.png`: Performance report showing Index speedup factors.

---

## 12. Testing Report

| Test Case ID | Test Case Title | Scenario & Inputs | Expected Result | Actual Result | Status |
|:---|:---|:---|:---|:---|:---|
| **TC-01** | Registration Success | Register student with fresh email, verify and log in. | Account created, verification email link works, login returns token. | Account created and verified. | **Pass** |
| **TC-02** | Duplicate Registration | Register student twice for the same event ID. | Database rejects second write via `UNIQUE` constraint, returns HTTP 409. | Returned 409: "Already registered". | **Pass** |
| **TC-03** | Full Event Registration | Register student to event with `remaining_seats = 0`. | API rejects request, returns HTTP 400. | Returned 400: "Event is full". | **Pass** |
| **TC-04** | Unsafe Concurrency | Fire 5 requests to 1-seat event without row locking. | Event capacity drops to negative; multiple bookings succeed. | Bookings: 5, Seats: -4. | **Pass** |
| **TC-05** | Safe Concurrency | Fire 5 requests to 1-seat event with `SELECT FOR UPDATE`. | Exactly 1 booking succeeds; 4 fail and roll back safely. | Bookings: 1, Seats: 0. | **Pass** |
| **TC-06** | Cancellation restores seat | Cancel a student registration. | Registration marked cancelled; event seats increment by 1. | Seats incremented immediately. | **Pass** |
| **TC-07** | RBAC Middleware | Access `/api/reports/admin-summary` as a student role. | Request blocked, returns HTTP 403 Forbidden. | Returned 403 Forbidden. | **Pass** |

---

## 13. System Setup & Run Instructions

### Prerequisites
- **Node.js**: Version 20.x
- **PostgreSQL**: Version 15+

### Installation & Configuration

1. **Clone the repository and go to the project directory**:
   ```bash
   cd campus-connect-system
   ```

2. **Configure environment variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://username:password@localhost:5432/campus_connect?schema=public"
   JWT_SECRET="your_jwt_signing_key_here"
   JWT_EXPIRE="1h"
   REFRESH_SECRET="your_refresh_signing_key_here"
   REFRESH_EXPIRE="7d"
   ```

3. **Install Dependencies**:
   ```bash
   # Install Backend Dependencies
   cd backend
   npm install

   # Install Frontend Dependencies
   cd ../frontend
   npm install
   ```

4. **Prepare Database**:
   Run database schema migrations and indexes, then seed database:
   ```bash
   cd ../backend
   # Run Prisma database push to apply schemas
   npx prisma db push

   # Seed the database (Creates 15 clubs, 5 admins, 800 students, 120 events, ~2,000 registrations)
   node seed/seed.js
   ```

5. **Start Servers**:
   ```bash
   # Run Backend Server (from backend directory)
   npm run dev

   # Run Frontend Server (from frontend directory in a separate terminal)
   npm run dev
   ```

6. **Log In Credentials**:
   - **Student Profile Login**: `student1@college.edu` / `password123`
   - **Admin Console Login**: `admin1@college.edu` / `password123`
