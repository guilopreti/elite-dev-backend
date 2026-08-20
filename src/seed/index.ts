import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.ts';
import * as catalogService from '../modules/catalog/catalog.service.ts';

const BCRYPT_ROUNDS = 10;
const SEED_PASSWORD = 'password123';

/**
 * Fixed identifiers make the seed idempotent: every record is upserted by a
 * stable key, so running it repeatedly leaves the database in the same state
 * and never duplicates data.
 */
const EVENT_ID = 'e1f4c0de-0000-4000-8000-000000000001';
const SEED_TMDB_ID = 603; // The Matrix

const USERS = [
  { email: 'organizer@elitedev.test', name: 'Olivia Organizer', role: 'organizer' as const },
  { email: 'customer1@elitedev.test', name: 'Caio Customer', role: 'customer' as const },
  { email: 'customer2@elitedev.test', name: 'Clara Customer', role: 'customer' as const },
  { email: 'gate@elitedev.test', name: 'Gabriel Gate', role: 'gate' as const },
];

const EVENT = {
  venue: 'Cine Verzel — Sala 1',
  date: new Date('2026-12-05T20:00:00.000Z'),
  price: 45,
  capacity: 50,
};

async function seedUsers() {
  const password_hash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);

  return Promise.all(
    USERS.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: { ...user, password_hash },
      }),
    ),
  );
}

async function seedEvent(organizerId: string) {
  // The movie metadata comes from TMDb, the same source the events module uses,
  // so seeded data is indistinguishable from data created through the API.
  const movie = await catalogService.getMovieById(SEED_TMDB_ID);

  return prisma.event.upsert({
    where: { id: EVENT_ID },
    update: {},
    create: {
      id: EVENT_ID,
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path ?? '',
      ...EVENT,
      available_seats: EVENT.capacity,
      status: 'published',
      organizer_id: organizerId,
    },
  });
}

async function main() {
  const users = await seedUsers();
  const organizer = users.find((user) => user.role === 'organizer');

  if (!organizer) {
    throw new Error('Organizer was not created');
  }

  const event = await seedEvent(organizer.id);

  console.log('Seed completed:');
  for (const user of users) {
    console.log(`  ${user.role.padEnd(9)} ${user.email} / ${SEED_PASSWORD}`);
  }
  console.log(`  event     ${event.title} — ${event.available_seats} seats — id ${event.id}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
