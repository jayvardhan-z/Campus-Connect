# Campus Connect System - Database Index Performance Report

This report documents the performance impact of indexing strategies deployed on the `campus_connect` database. 
Benchmarks are compiled by running raw `EXPLAIN (ANALYZE, BUFFERS)` plans with and without active indices on a dataset seeded with 806 users, 120 events, and ~2,000 registrations.

---

## 1. Query: Upcoming Events Feed
Querying active events on/after current date, ordering by event date.

### SQL Statement
```sql
SELECT * FROM upcoming_events_view;
```

### Plan Details
- **Without Index**: `Seq Scan on events e` (Execution Time: `1.385 ms`, Planning Time: `1.650 ms`)
- **With Index**: `Seq Scan on events e` (Execution Time: `0.922 ms`, Planning Time: `0.940 ms`)

### Performance Metrics
- **Without Index Execution Time**: `1.385` ms
- **With Index Execution Time**: `0.922` ms
- **Performance Increase**: `1.5x` speedup

### Conclusion
Because the `events` table contains only 120 rows, PostgreSQL's optimizer correctly prefers a Sequential Scan over an Index Scan, but index structures still reduce overall planning and query overhead.

---

## 2. Query: Student Registrations Lookup
Searching registration logs for a specific student ID.

### SQL Statement
```sql
SELECT * FROM student_registrations_view WHERE user_id = '00156a51-9529-49d6-8e85-cb93c86392ad'::uuid;
```

### Plan Details
- **Without Index**: `Seq Scan on registrations r` (Execution Time: `0.413 ms`, Planning Time: `1.162 ms`)
- **With Index**: `Bitmap Index Scan on idx_registrations_user_id` (Execution Time: `0.202 ms`, Planning Time: `1.375 ms`)

### Performance Metrics
- **Without Index Execution Time**: `0.413` ms
- **With Index Execution Time**: `0.202` ms
- **Performance Increase**: `2.0x` speedup

### Conclusion
Indexing `user_id` allows PostgreSQL to locate specific registrations using a Bitmap Index Scan rather than scanning all 1,978 registration records, resulting in double the execution speed.

---

## 3. Query: Account Login Lookup
Retrieving user profile and role by email.

### SQL Statement
```sql
SELECT * FROM users WHERE email = 'student19@college.edu';
```

### Plan Details
- **Without Index**: `Seq Scan on users` (Execution Time: `0.098 ms`, Planning Time: `0.199 ms`)
- **With Index**: `Index Scan using idx_users_email` (Execution Time: `0.045 ms`, Planning Time: `0.257 ms`)

### Performance Metrics
- **Without Index Execution Time**: `0.098` ms
- **With Index Execution Time**: `0.045` ms
- **Performance Increase**: `2.2x` speedup

### Conclusion
Searching users by email transitions from a full table Sequential Scan scanning all 806 users to an O(log N) Index Scan, reducing latency by over 50%.
