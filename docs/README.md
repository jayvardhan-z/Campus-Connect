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

## 2. System Architecture & Inter-Tier Connection

Campus Connect utilizes a modular 3-tier client-server architecture designed for reliability, strict data consistency, and high performance under concurrent usage.

### 2.1 Architectural Diagram

```mermaid
flowchart TD
    subgraph ClientTier["Presentation Tier (Frontend - React 18 + Vite)"]
        UI["React UI Pages & Components\n(Tailwind CSS, Lucide Icons, Recharts)"]
        State["React Context & LocalStorage\n(AuthContext, Tokens, User State)"]
        Axios["Axios HTTP Client\n(Request & Response Interceptors,\nToken Refresh Queue)"]
        UI <--> State
        UI --> Axios
    end

    subgraph APITier["Application / API Tier (Backend - Node.js + Express)"]
        Proxy["Vite Dev Proxy / Nginx (/api)"]
        Security["Security Middlewares\n(Helmet, CORS, Rate Limiters, Cookie Parser)"]
        AuthMiddleware["Authentication & RBAC Middleware\n(JWT Verification, Role Guard)"]
        Controllers["Controllers Layer\n(Auth, Events, Registrations, Reports, Dashboard, Clubs)"]
        Services["Domain Transaction Services\n(registration.service.js)"]
        
        Proxy --> Security --> AuthMiddleware --> Controllers
        Controllers --> Services
    end

    subgraph DataTier["Data Persistence Tier (PostgreSQL 15+)"]
        ORM["Prisma Client Engine\n(Type-Safe CRUD, Relation Loading)"]
        PG["pg.Pool Connection Pool\n(Raw SQL, Transaction Locking, SQL Views)"]
        Tables[("PostgreSQL Relational Tables\n(Users, Profiles, Clubs, Events,\nRegistrations, Announcements)")]
        Views[("SQL Analytical Views\n(upcoming_events_view,\nstudent_registrations_view,\nevent_statistics_view)")]
        Indexes[("B-Tree Performance Indexes\n(idx_events_status_date, idx_events_club_id,\nidx_registrations_user_id)")]

        Controllers --> ORM --> Tables
        Controllers --> PG --> Views
        Services --> PG --> Tables
        Tables --- Indexes
    end

    Axios -->|"HTTP/JSON REST over TCP:5000\n(Authorization: Bearer <JWT>)"| Proxy
    ORM & PG -->|"PostgreSQL Wire Protocol over TCP:5432\n(Connection Pooling)"| Tables
```

### 2.2 How Frontend, Backend, and Database Connect to Each Other

1. **Frontend to Backend Communication**:
   - **Protocol & Serialization**: Communication occurs exclusively over standard HTTP/1.1 REST using JSON payloads.
   - **Reverse Proxying**: In local development, the Vite dev server (`frontend/vite.config.js`) exposes a reverse proxy on `/api` forwarding requests to `http://localhost:5000` (`changeOrigin: true`), eliminating CORS overhead during development.
   - **Cross-Origin Resource Sharing (CORS)**: The backend configures `cors({ origin: process.env.FRONTEND_URL, credentials: true })` to allow cross-origin requests from the client SPA while supporting secure cookies.
   - **Session & Token Handshake**:
     - The client sends short-lived JWT Access Tokens in the `Authorization: Bearer <accessToken>` header on all protected requests.
     - Axios request interceptors automatically read the token from `localStorage` and inject it into outgoing request headers.
     - If an access token expires (HTTP 401), the Axios response interceptor intercepts the error, queues any concurrent requests, invokes `POST /api/auth/refresh` with the stored `refreshToken`, updates credentials, and transparently retries the queued requests without user disruption.

2. **Backend to Database Communication**:
   - **Protocol & Network Transport**: The Node.js application connects to PostgreSQL via TCP/IP using the native PostgreSQL wire protocol through standard connection strings (`DATABASE_URL=postgresql://user:password@localhost:5432/campus_connect?schema=public`).
   - **Dual-Driver Architecture**:
     - **Prisma Client (`@prisma/client`)**: Manages general entity CRUD operations, nested relations (e.g. `include: { club: true }`), and schema synchronizations.
     - **Native PostgreSQL Connection Pool (`pg.Pool`)**: Maintains a persistent pool of TCP socket connections used where Prisma's abstraction is unsuitable—namely, row-level locking (`SELECT ... FOR UPDATE`), atomic multi-step transactions (`BEGIN/COMMIT/ROLLBACK`), and direct querying of database views (`SELECT * FROM upcoming_events_view`).
   - **Connection Lifecycle**: For transactional workflows (such as event registrations), a dedicated client socket is checked out from the pool (`await pool.connect()`), transactional queries execute sequentially, and the client socket is released back to the pool in a mandatory `finally { client.release(); }` block to guarantee zero connection leaks.

---

## 3. Data Dependencies Across Layers

### 3.1 Relational Entity Dependency Hierarchy

The relational schema implements referential integrity through foreign key constraints that dictate explicit data creation and deletion cascades:

```text
[User] (Root Identity Entity)
  │
  ├── (1:1 CASCADE) ────────> [StudentProfile] (Demographic details)
  │
  ├── (1:N SET NULL) ───────> [Event] (as creator / admin audit record)
  │
  ├── (1:N SET NULL) ───────> [Announcement] (as author)
  │
  └── (1:N CASCADE) ────────> [Registration] (Student event bookings)
                                   ▲
                                   │ (N:1 CASCADE)
[Club] (Domain Organizer)          │
  │                                │
  ├── (1:N CASCADE) ────────> [Event] (Scheduled venue & capacity)
  │
  └── (1:N CASCADE) ────────> [Announcement] (Club-scoped updates)
```

- **Cascade Rules (`ON DELETE CASCADE`)**:
  - Deleting a `User` cascades to delete their `StudentProfile` and all active `Registration` records.
  - Deleting a `Club` cascades to delete its `Event` records and club-scoped `Announcement` records.
  - Deleting an `Event` cascades to purge all student `Registration` records associated with that event.
- **Audit Preservation (`ON DELETE SET NULL`)**:
  - Deleting an admin `User` sets `created_by = NULL` in `Event` and `posted_by = NULL` in `Announcement`, preserving historical events and broadcasts for auditing.

### 3.2 Cross-Tier Data Transformation Lifecycle

```text
PostgreSQL Data Types  ───>  Backend Models/DTOs   ───>  HTTP JSON Payloads  ───>  Frontend React State
---------------------        -------------------         ------------------        --------------------
UUID (Primary Key)           String (id)                 "id": "uuid-v4"           state.event.id
TIMESTAMPTZ                  JavaScript Date             "eventDate": "ISO-8601"   new Date(e.eventDate).toLocaleDateString()
remaining_seats (INTEGER)    remainingSeats (Number)     "remainingSeats": 12      seatsRemainingBadge
(total - remaining)          Computed / Expression       "registrationCount": 8    Capacity Progress Bar
```

---

## 4. End-to-End Data Flow (User Perspective)

### 4.1 Flow 1: Student Authentication & Session Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser)
    participant Client as React App (Axios)
    participant Server as Express Server
    participant DB as PostgreSQL

    Student->>Client: Enters email & password on /login
    Client->>Server: POST /api/auth/login { email, password }
    Server->>DB: SELECT * FROM users WHERE email = $1
    DB-->>Server: User record + password_hash
    Server->>Server: Verify password with bcrypt.compare()
    Server->>Server: Generate accessToken (15m) & refreshToken (7d)
    Server-->>Client: HTTP 200 { accessToken, refreshToken, user }
    Client->>Client: Store accessToken & user in localStorage
    Client->>Student: Redirects to /dashboard
    Client->>Server: GET /api/reports/student-summary (Bearer Token)
    Server->>DB: Query views & counts for user
    DB-->>Server: Dashboard aggregated rows
    Server-->>Client: HTTP 200 { data: { upcomingEvents, myRegistrations, ... } }
    Client->>Student: Renders dashboard metrics
```

### 4.2 Flow 2: Event Discovery, Multi-Criteria Filtering & Pagination

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser)
    participant UI as EventsPage Component
    participant Server as Express (getEvents)
    participant DB as PostgreSQL

    Student->>UI: Selects category "Technical", enters search "AI", clicks sort "latest"
    UI->>Server: GET /api/events?page=1&limit=10&q=AI&category=Technical&sort=latest
    Server->>Server: Validates params & builds dynamic WHERE clause with $1, $2 placeholders
    Server->>DB: Execute count query: SELECT COUNT(*) FROM events e JOIN clubs c ... WHERE ...
    DB-->>Server: Total matching records (e.g., 24)
    Server->>DB: Execute paginated query using B-Tree index (idx_events_status_date) + LIMIT 10 OFFSET 0
    DB-->>Server: 10 event rows with calculated registration_count
    Server-->>UI: HTTP 200 { status: 'success', data: [...], total: 24, page: 1, totalPages: 3 }
    UI->>Student: Updates events grid & pagination controls
```

### 4.3 Flow 3: Atomic Event Registration & Pessimistic Concurrency

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser)
    participant UI as EventDetailPage
    participant Service as registration.service.js
    participant DB as PostgreSQL

    Student->>UI: Clicks "Register for Event"
    UI->>Service: POST /api/registrations/:eventId (Bearer JWT)
    Service->>DB: BEGIN TRANSACTION
    Service->>DB: SELECT remaining_seats, status FROM events WHERE id = $1 FOR UPDATE
    Note over DB: Row is locked. Concurrent transactions on this event row block here.
    DB-->>Service: remaining_seats = 4, status = 'active'
    Service->>DB: SELECT id, status FROM registrations WHERE event_id = $1 AND user_id = $2 FOR UPDATE
    DB-->>Service: No existing registration
    Service->>DB: INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, 'registered')
    Service->>DB: UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = $1
    Service->>DB: COMMIT
    Note over DB: Lock released. Next queued transaction acquires lock and reads remaining_seats = 3.
    Service-->>UI: HTTP 201 { success: true, message: 'Registered successfully' }
    UI->>UI: Update registrationStatus to 'registered'
    UI->>Student: Shows success alert & updates "Seats Remaining" badge immediately
```

### 4.4 Flow 4: Admin Analytics & Participation Monitoring

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin (Browser)
    participant UI as AdminDashboardPage
    participant Server as Express (reports.controller.js)
    participant DB as PostgreSQL

    Admin->>UI: Navigates to /admin/dashboard
    UI->>Server: GET /api/reports/admin-summary (Admin JWT)
    Server->>Server: requireRole('admin') middleware validates admin claim
    Server->>DB: Parallel query execution:
    Note over DB: 1. Total counts: students, clubs, events, registrations<br/>2. Top event: SELECT * FROM event_statistics_view ORDER BY active_registrations DESC LIMIT 1<br/>3. Monthly trends: DATE_TRUNC('month', registered_at) last 6 months
    DB-->>Server: Metrics, most popular event, and monthly timeseries
    Server-->>UI: HTTP 200 { metrics: {...}, mostPopularEvent: {...}, monthlyRegistrationStats: [...] }
    UI->>Admin: Renders metric overview cards and Recharts registration trend charts
```

---

## 5. Entity-Relationship (ER) Diagram

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

## 6. Relational Schema (Final, 3NF Normalized)

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

## 7. Normalization Proof (1NF / 2NF / 3NF)

### 7.1 Functional Dependencies (FDs)
* **User**: `id` $\rightarrow$ `email`, `password_hash`, `role`, `is_verified`
* **StudentProfile**: `id` $\rightarrow$ `user_id`, `full_name`, `department`, `year_of_study`, `phone`, `bio`
* **Club**: `id` $\rightarrow$ `name`, `description`, `category`
* **Event**: `id` $\rightarrow$ `club_id`, `title`, `description`, `venue`, `event_date`, `event_time`, `total_seats`, `remaining_seats`, `status`, `created_by`
* **Registration**: `id` $\rightarrow$ `event_id`, `user_id`, `status`, `registered_at`; `(event_id, user_id)` $\rightarrow$ `id`, `status`, `registered_at`
* **Announcement**: `id` $\rightarrow$ `posted_by`, `club_id`, `title`, `content`

### 7.2 First Normal Form (1NF) Proof
- **Rule**: A table is in 1NF if and only if the domain of each attribute contains only atomic (indivisible) values, and there are no repeating groups.
- **Before Fix Violation**: The original student schema contained a `registered_events` field on the student profile table storing a comma-separated string of event IDs (e.g. `"Event-01, Event-02"`). This is a multi-valued repeating group.
- **Proof of Correction**: The repeating list is completely decomposed. The student profile now contains only single-valued demographic attributes (`full_name`, `department`, etc.). Events registrations are mapped as individual, atomic tuples in the associative `Registration` table, satisfying 1NF.

### 7.3 Second Normal Form (2NF) Proof
- **Rule**: A table is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key (no partial dependencies).
- **Before Fix Violation**: In the draft registration table with composite key `(event_id, user_id)`, the fields `event_title` and `club_name` were stored. Since `event_id` $\rightarrow$ `event_title`, `event_title` was partially dependent on only part of the key.
- **Proof of Correction**: All partial dependencies have been removed. The `Registration` table stores only `event_id`, `user_id`, `status`, and `registered_at`. Attributes such as `event_title` and `club_name` have been relocated to their home tables (`Event` and `Club`) where they depend fully on the singular primary keys, satisfying 2NF.

### 7.4 Third Normal Form (3NF) Proof
- **Rule**: A table is in 3NF if it is in 2NF and there is no transitive dependency for non-prime attributes. That is, no non-prime attribute determines another non-prime attribute.
- **Before Fix Violation**: The `Event` table originally stored `club_name` and `club_category` alongside `club_id`. The dependencies were: `event_id` $\rightarrow$ `club_id` $\rightarrow$ `club_name`/`club_category`. Since `club_id` is a non-prime attribute, this represents a transitive dependency.
- **Proof of Correction**: The transitive columns `club_name` and `club_category` were removed from the `Event` table. The `Event` table now contains only `club_id` as a foreign key reference. The metadata details are queried by joining with the `Club` table on demand. Thus, all non-prime attributes depend only on the key, the whole key, and nothing but the key, satisfying 3NF.

---

## 8. Database Schema Reference

- Core Database Schema: [database/01_schema.sql](../database/01_schema.sql)
- Optimization Indexes: [database/02_indexes.sql](../database/02_indexes.sql)

---

## 9. Core Application SQL Queries

The core SQL operations utilized across backend controllers and services include:

- **Dynamic Event Catalog Filtering & Search** (from `event.controller.js`):
  ```sql
  SELECT 
    e.id, e.club_id, e.title, e.description, e.venue, 
    e.event_date, e.event_time, e.total_seats, e.remaining_seats, e.status,
    c.name AS club_name, c.category AS club_category,
    (e.total_seats - e.remaining_seats) AS registration_count
  FROM events e
  INNER JOIN clubs c ON e.club_id = c.id
  WHERE e.status = 'active'
    AND (e.title ILIKE $1 OR c.name ILIKE $1)
    AND e.event_date >= CURRENT_DATE
  ORDER BY e.event_date ASC
  LIMIT $2 OFFSET $3;
  ```

- **Department Registration Filtering (Subquery with `EXISTS`)**:
  ```sql
  EXISTS (
    SELECT 1 
    FROM registrations r 
    INNER JOIN student_profiles sp ON r.user_id = sp.user_id 
    WHERE r.event_id = e.id 
      AND sp.department = $1 
      AND r.status = 'registered'
  );
  ```

- **Pessimistic Row-Locking for Event Registration** (from `registration.service.js`):
  ```sql
  BEGIN;
  SELECT remaining_seats, status FROM events WHERE id = $1 FOR UPDATE;
  INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, 'registered');
  UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = $1;
  COMMIT;
  ```

- **Monthly Registration Analytics** (from `reports.controller.js`):
  ```sql
  SELECT 
    TO_CHAR(DATE_TRUNC('month', registered_at), 'YYYY-MM') AS month,
    COUNT(*)::INTEGER AS count
  FROM registrations
  WHERE status = 'registered'
    AND registered_at >= NOW() - INTERVAL '6 months'
  GROUP BY DATE_TRUNC('month', registered_at)
  ORDER BY month DESC;
  ```

---

## 10. Views Reference

Persistent views are configured in [database/03_views.sql](../database/03_views.sql) to decouple complex analytical aggregations from application controllers:

1. `upcoming_events_view`: Selects active upcoming events joined to their organizing clubs and performs a left join grouping to count current active registrations.
2. `student_registrations_view`: Aggregates active student registrations, returning event details, venue, dates, and status for student dashboard feeds.
3. `event_statistics_view`: Evaluates registration counts, cancellations, and capacity fill rate percentages:
   ```sql
   CREATE VIEW event_statistics_view AS
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
   ```

---

## 11. Transactions & Concurrency Control

### 11.1 The Race Condition
In a standard multi-user system, event registration operates in a check-then-write sequence:
1. `SELECT remaining_seats FROM events WHERE id = $1;`
2. If `remaining_seats > 0`, proceed to write.
3. `INSERT INTO registrations (event_id, user_id);`
4. `UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = $1;`

If an event has exactly **1 seat remaining** and two transactions (`TxA` and `TxB`) execute Step 1 at the same millisecond under normal `READ COMMITTED` isolation, both read `remaining_seats = 1`. Both evaluate the check as successful, insert a registration, and update the seats. The seat count drops to `-1` (negative), resulting in **overbooking (double booking)**. This violates the ACID consistency guarantee.

### 11.2 The Pessimistic Row-Locking Fix (`FOR UPDATE`)
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

### 11.3 The Isolation-Level Alternative (`SERIALIZABLE`)
Instead of explicit locks, we can set the transaction isolation level to `SERIALIZABLE`:
```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```
Under this level, PostgreSQL monitors concurrent transactions. If `TxA` and `TxB` read the same event row and both try to write updates, PostgreSQL detects a serialization conflict. It allows one transaction to commit, while immediately terminating the other with a **Serialization Failure (SQLState 40001)**. The application must catch this error and retry the transaction.

---

## 12. Performance Indexing Strategy

The production indexing strategy in [database/02_indexes.sql](../database/02_indexes.sql) eliminates duplicate indexes while optimizing all high-frequency query paths:

- **Automatic Unique Indexes**: `users.email` and `(event_id, user_id)` in `registrations` are inherently indexed by PostgreSQL via their `UNIQUE` constraints.
- **`idx_events_event_date`**: Accelerates date-range queries (`BETWEEN`, `>= CURRENT_DATE`) and chronological sorting.
- **`idx_events_club_id`**: Speeds up foreign-key joins between `events` and `clubs`.
- **`idx_events_status_date`**: Composite index supporting common filtered listings (`WHERE status = 'active' ORDER BY event_date ASC`).
- **`idx_registrations_user_id`**: Speeds up student registration roster lookups and dashboard activity feeds.

---

## 13. API Reference Documentation

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
| **GET** | `/api/registrations/status/:eventId` | Yes | `student` | Checks active registration status for an event |
| **POST** | `/api/registrations/:eventId` | Yes | `student` | Safe atomic event registration |
| **DELETE** | `/api/registrations/:eventId` | Yes | `student` | Cancels event registration and updates capacity |
| **GET** | `/api/registrations/event/:eventId` | Yes | `admin` | Returns participant directory list for an event |
| **GET** | `/api/dashboard/event-stats/:id` | Yes | `admin` | Retrieves registration and fill rate stats for an event |
| **GET** | `/api/announcements` | Yes | Any | Retrieves announcements bulletin board feed |
| **POST** | `/api/announcements` | Yes | `admin` | Posts new announcement |
| **DELETE** | `/api/announcements/:id` | Yes | `admin` | Deletes/withdraws active announcement |
| **GET** | `/api/reports/student-summary` | Yes | `student` | Retrieves student dashboard summary metrics |
| **GET** | `/api/reports/admin-summary` | Yes | `admin` | Retrieves admin dashboard statistics |

---

## 14. Screenshots Section

Screenshots proving interface capabilities are captured and stored in `docs/screenshots/`:

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

---

## 15. Testing Report

| Test Case ID | Test Case Title | Scenario & Inputs | Expected Result | Actual Result | Status |
|:---|:---|:---|:---|:---|:---|
| **TC-01** | Registration Success | Register student with fresh email, verify and log in. | Account created, verification email link works, login returns token. | Account created and verified. | **Pass** |
| **TC-02** | Duplicate Registration | Register student twice for the same event ID. | Database rejects second write via `UNIQUE` constraint, returns HTTP 409. | Returned 409: "Already registered". | **Pass** |
| **TC-03** | Full Event Registration | Register student to event with `remaining_seats = 0`. | API rejects request, returns HTTP 400. | Returned 400: "Event is full". | **Pass** |
| **TC-04** | Safe Concurrency | Fire concurrent requests to 1-seat event with `SELECT FOR UPDATE`. | Exactly 1 booking succeeds; others safely roll back. | Bookings: 1, Seats: 0. | **Pass** |
| **TC-05** | Cancellation restores seat | Cancel a student registration. | Registration marked cancelled; event seats increment by 1. | Seats incremented immediately. | **Pass** |
| **TC-06** | RBAC Middleware | Access `/api/reports/admin-summary` as a student role. | Request blocked, returns HTTP 403 Forbidden. | Returned 403 Forbidden. | **Pass** |

---

## 16. System Setup & Run Instructions

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
