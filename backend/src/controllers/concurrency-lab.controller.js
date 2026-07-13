import { pool, prisma } from '../config/db.js';
import { registerForEvent } from '../services/registration.service.js';
import { registerForEventUnsafe } from '../services/registration-unsafe.service.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const simulateConcurrency = asyncHandler(async (req, res, next) => {
  const { eventId, mode, concurrentRequests = 5 } = req.body;

  if (!eventId || !mode) {
    return next(new AppError('eventId and mode ("safe" or "unsafe") are required', 400));
  }

  // Verify event exists and is a demo event
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return next(new AppError('Event not found', 404));
  }
  if (!event.isDemo) {
    return next(new AppError('Simulation is only allowed on demo events', 400));
  }

  // 1. Create dummy student users
  const dummyUserIds = [];
  try {
    for (let i = 0; i < concurrentRequests; i++) {
      const email = `lab_dummy_${Date.now()}_${i}@demo.edu`;
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: 'demo_password_hash',
          role: 'student',
          isVerified: true,
          profile: {
            create: {
              fullName: `Demo Student ${i}`
            }
          }
        }
      });
      dummyUserIds.push(user.id);
    }

    // 2. Reset event remaining seats to 1
    await prisma.event.update({
      where: { id: eventId },
      data: { remainingSeats: 1 }
    });

    // 3. Fire concurrent requests
    const promises = dummyUserIds.map(userId => {
      if (mode === 'unsafe') {
        return registerForEventUnsafe(eventId, userId);
      } else {
        return registerForEvent(eventId, userId);
      }
    });

    const results = await Promise.allSettled(promises);

    // 4. Calculate success/failure counts
    let successCount = 0;
    let failureCount = 0;
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value && res.value.success) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    // Get final remaining seats
    const updatedEvent = await prisma.event.findUnique({ where: { id: eventId } });
    const finalRemainingSeats = updatedEvent.remainingSeats;

    res.status(200).json({
      status: 'success',
      mode,
      successCount,
      failureCount,
      finalRemainingSeats,
      overbooked: successCount > 1
    });

  } finally {
    // 5. Cleanup dummy registrations and users
    if (dummyUserIds.length) {
      await prisma.registration.deleteMany({
        where: { userId: { in: dummyUserIds } }
      });
      await prisma.studentProfile.deleteMany({
        where: { userId: { in: dummyUserIds } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: dummyUserIds } }
      });
    }
  }
});

// Isolation levels helper simulation functions
async function runReadCommitted(eventId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Defaults to READ COMMITTED in Postgres
    const { rows } = await client.query('SELECT remaining_seats FROM events WHERE id = $1', [eventId]);
    if (rows[0].remaining_seats <= 0) throw new Error('Full');
    
    await new Promise(r => setTimeout(r, 300));
    
    await client.query('INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, $3)', [eventId, userId, 'registered']);
    await client.query('UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = $1', [eventId]);
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, message: err.message };
  } finally {
    client.release();
  }
}

async function runSerializable(eventId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    const { rows } = await client.query('SELECT remaining_seats FROM events WHERE id = $1', [eventId]);
    if (rows[0].remaining_seats <= 0) throw new Error('Full');
    
    await new Promise(r => setTimeout(r, 300));
    
    await client.query('INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, $3)', [eventId, userId, 'registered']);
    await client.query('UPDATE events SET remaining_seats = remaining_seats - 1 WHERE id = $1', [eventId]);
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, code: err.code, message: err.message };
  } finally {
    client.release();
  }
}

export const simulateIsolationDemo = asyncHandler(async (req, res, next) => {
  const { eventId, concurrentRequests = 3 } = req.query;

  if (!eventId) {
    return next(new AppError('eventId query parameter is required', 400));
  }

  // Verify event is demo
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return next(new AppError('Event not found', 404));
  }
  if (!event.isDemo) {
    return next(new AppError('Isolation demo is only allowed on demo events', 400));
  }

  const dummyUserIds = [];
  try {
    // 1. Create dummy student users
    for (let i = 0; i < concurrentRequests * 2; i++) {
      const email = `lab_isolation_${Date.now()}_${i}@demo.edu`;
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: 'demo_password_hash',
          role: 'student',
          isVerified: true,
          profile: {
            create: {
              fullName: `Isolation Demo Student ${i}`
            }
          }
        }
      });
      dummyUserIds.push(user.id);
    }

    const rcUserIds = dummyUserIds.slice(0, concurrentRequests);
    const serUserIds = dummyUserIds.slice(concurrentRequests);

    // 2. Test READ COMMITTED
    await prisma.event.update({
      where: { id: eventId },
      data: { remainingSeats: 1 }
    });
    const rcPromises = rcUserIds.map(userId => runReadCommitted(eventId, userId));
    const rcResults = await Promise.allSettled(rcPromises);
    let rcSuccesses = 0;
    rcResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value.success) rcSuccesses++;
    });

    // 3. Test SERIALIZABLE
    await prisma.event.update({
      where: { id: eventId },
      data: { remainingSeats: 1 }
    });
    const serPromises = serUserIds.map(userId => runSerializable(eventId, userId));
    const serResults = await Promise.allSettled(serPromises);
    let serSuccesses = 0;
    let serializationFailures = 0;
    serResults.forEach(r => {
      if (r.status === 'fulfilled') {
        if (r.value.success) serSuccesses++;
        if (r.value.code === '40001') serializationFailures++;
      }
    });

    res.status(200).json({
      status: 'success',
      readCommittedResults: {
        successCount: rcSuccesses,
        overbooked: rcSuccesses > 1,
        explanation: 'Allows overbooking because it permits dirty reads or concurrent reads of uncommitted data changes without lock conflicts.'
      },
      serializableResults: {
        successCount: serSuccesses,
        serializationFailures,
        overbooked: serSuccesses > 1,
        explanation: 'Prevents overbooking by throwing serialization errors (code 40001) when it detects overlapping transactions trying to modify the same data.'
      }
    });

  } finally {
    // 4. Cleanup dummy data
    if (dummyUserIds.length) {
      await prisma.registration.deleteMany({
        where: { userId: { in: dummyUserIds } }
      });
      await prisma.studentProfile.deleteMany({
        where: { userId: { in: dummyUserIds } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: dummyUserIds } }
      });
    }
  }
});
