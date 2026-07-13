import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = ['Technical', 'Coding', 'Robotics', 'Music', 'Dance', 'Sports', 'Drama', 'Arts', 'Literature', 'Management'];
const departments = ['Computer Science', 'Information Technology', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Electronics', 'Chemical Engineering', 'Biotechnology'];
const clubNames = [
  'Coding Club', 'Robotics Club', 'Developers Association', 'Music Club', 'Dance Crew',
  'Sports Club', 'Drama Society', 'Fine Arts Club', 'Literary Club', 'Finance & Management Club',
  'Anime Club', 'Photography Club', 'Debate Club', 'Astronomy Club', 'Gaming League'
];

async function main() {
  console.log('Checking database state...');
  const userCount = await prisma.user.count();
  if (userCount > 50) {
    console.log(`Database already seeded with ${userCount} users. Exiting early to prevent duplicate seeding.`);
    return;
  }

  console.log('Starting seed process. Generating password hashes...');
  // Hash once and reuse to save 800+ rounds of slow hashing CPU time
  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Seed Admins
  console.log('Seeding admins...');
  const admins = [];
  for (let i = 0; i < 5; i++) {
    const admin = await prisma.user.create({
      data: {
        email: `admin${i}@college.edu`,
        passwordHash,
        role: 'admin',
        isVerified: true
      }
    });
    admins.push(admin);
  }

  // 2. Seed Clubs
  console.log('Seeding clubs...');
  const clubs = [];
  for (let i = 0; i < 15; i++) {
    const club = await prisma.club.create({
      data: {
        name: clubNames[i],
        description: `Official campus club for ${clubNames[i]} interests and activities.`,
        category: categories[i % categories.length]
      }
    });
    clubs.push(club);
  }

  // 3. Seed Students
  console.log('Seeding 800 students...');
  const students = [];
  const studentPromises = [];
  
  for (let i = 0; i < 800; i++) {
    const dept = departments[i % departments.length];
    const year = (i % 4) + 1;
    studentPromises.push(
      prisma.user.create({
        data: {
          email: `student${i}@college.edu`,
          passwordHash,
          role: 'student',
          isVerified: true,
          profile: {
            create: {
              fullName: `Student ${i}`,
              department: dept,
              yearOfStudy: year,
              phone: `1234567${i.toString().padStart(3, '0')}`,
              bio: `I am a student in department ${dept}.`
            }
          }
        }
      })
    );

    if (studentPromises.length >= 100) {
      const created = await Promise.all(studentPromises);
      students.push(...created);
      studentPromises.length = 0;
      console.log(`  Seeded ${students.length} students...`);
    }
  }
  if (studentPromises.length > 0) {
    const created = await Promise.all(studentPromises);
    students.push(...created);
  }

  // 4. Seed Events
  console.log('Seeding 120 events...');
  const createdEvents = [];

  // Seed the special is_demo=true event for Concurrency Lab
  const demoEvent = await prisma.event.create({
    data: {
      clubId: clubs[0].id,
      title: 'Demo Concurrency Event',
      description: 'Special concurrency testing event',
      venue: 'Lab Room 404',
      eventDate: new Date(),
      totalSeats: 20,
      remainingSeats: 1,
      status: 'active',
      isDemo: true,
      createdById: admins[0].id
    }
  });
  createdEvents.push(demoEvent);

  for (let i = 1; i < 120; i++) {
    const club = clubs[i % clubs.length];
    const isCancelled = i % 100 >= 85; // 85% active, 15% cancelled
    const dateOffset = Math.floor(Math.random() * 120) - 60; // +- 60 days
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + dateOffset);
    
    const totalSeats = Math.floor(Math.random() * 9) * 20 + 40; // 40 to 200
    
    const event = await prisma.event.create({
      data: {
        clubId: club.id,
        title: `${club.name} Event ${i}`,
        description: `Description for event ${i} hosted by ${club.name}.`,
        venue: `Hall ${i % 5 + 1}`,
        eventDate,
        totalSeats,
        remainingSeats: totalSeats,
        status: isCancelled ? 'cancelled' : 'active',
        isDemo: false,
        createdById: admins[i % admins.length].id
      }
    });
    createdEvents.push(event);
  }

  // 5. Seed Skewed Registrations (~4,000 registrations)
  console.log('Seeding ~4,000 registrations (skewed)...');
  const registrations = [];
  const registeredSet = new Set();

  const popularEvents = createdEvents.filter(e => e.status === 'active' && !e.isDemo).slice(0, 5);
  const otherEvents = createdEvents.filter(e => e.status === 'active' && !e.isDemo).slice(5);

  // Skew registrations to popular events (up to 150-200 registrations each)
  for (const event of popularEvents) {
    const numRegs = Math.min(event.totalSeats - 5, 180);
    const selectedStudents = [...students].sort(() => 0.5 - Math.random()).slice(0, numRegs);
    for (const student of selectedStudents) {
      registrations.push({
        eventId: event.id,
        userId: student.id,
        status: 'registered'
      });
      registeredSet.add(`${event.id}-${student.id}`);
    }
  }

  // Populate other events lightly (10-30 registrations each)
  for (const event of otherEvents) {
    const maxRegs = Math.min(event.totalSeats - 2, Math.floor(Math.random() * 20) + 5);
    const selectedStudents = [...students].sort(() => 0.5 - Math.random()).slice(0, maxRegs);
    for (const student of selectedStudents) {
      const key = `${event.id}-${student.id}`;
      if (!registeredSet.has(key)) {
        registrations.push({
          eventId: event.id,
          userId: student.id,
          status: 'registered'
        });
        registeredSet.add(key);
      }
    }
  }

  // Create registrations in chunks
  const regPromises = [];
  for (let i = 0; i < registrations.length; i++) {
    regPromises.push(
      prisma.registration.create({
        data: registrations[i]
      })
    );
    if (regPromises.length >= 200) {
      await Promise.all(regPromises);
      regPromises.length = 0;
    }
  }
  if (regPromises.length > 0) {
    await Promise.all(regPromises);
  }

  // Update remaining seats for events
  console.log('Updating events remaining_seats fields...');
  for (const event of createdEvents) {
    if (event.isDemo) continue;
    const activeCount = registrations.filter(r => r.eventId === event.id && r.status === 'registered').length;
    await prisma.event.update({
      where: { id: event.id },
      data: {
        remainingSeats: Math.max(0, event.totalSeats - activeCount)
      }
    });
  }

  // 6. Seed Announcements
  console.log('Seeding announcements...');
  const announcements = [];
  for (let i = 0; i < 20; i++) {
    const club = clubs[i % clubs.length];
    announcements.push({
      title: `Important Announcement ${i}`,
      content: `This is the body content for announcement number ${i} from ${club.name}. Please read carefully.`,
      clubId: club.id,
      postedById: admins[i % admins.length].id
    });
  }
  await prisma.announcement.createMany({ data: announcements });

  // Seeding Complete Summary
  const usersCount = await prisma.user.count();
  const profilesCount = await prisma.studentProfile.count();
  const clubsCount = await prisma.club.count();
  const eventsCount = await prisma.event.count();
  const registrationsCount = await prisma.registration.count();
  const announcementsCount = await prisma.announcement.count();

  console.log('====================================================');
  console.log('SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  console.log(`Users: ${usersCount}`);
  console.log(`Student Profiles: ${profilesCount}`);
  console.log(`Clubs: ${clubsCount}`);
  console.log(`Events: ${eventsCount}`);
  console.log(`Registrations: ${registrationsCount}`);
  console.log(`Announcements: ${announcementsCount}`);
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
