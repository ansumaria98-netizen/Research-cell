import dotenv from 'dotenv';
import { connectDB } from './connect.js';
import { seedDefaultUsersIfEmpty } from './userRepository.js';

dotenv.config();

async function runSeed() {
  console.log('--- IRIPGMS Module 1 Database Seed ---');
  await connectDB();
  await seedDefaultUsersIfEmpty();
  console.log('Seed completed successfully.');
  process.exit(0);
}

runSeed().catch(err => {
  console.error('Seed execution error:', err);
  process.exit(1);
});
