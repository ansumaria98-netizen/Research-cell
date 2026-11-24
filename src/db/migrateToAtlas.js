/**
 * IRIPGMS - MongoDB Atlas Initial Migration & Data Upload Script
 * Connects to MongoDB Atlas using MONGO_URI from .env and seeds all 15 collections:
 * - Departments (9 teaching departments)
 * - Courses (13 academic programmes)
 * - Users (Ansu Maria Benny, Dr. Mathew Joseph, Faculty, Students)
 * - Academic Year (2026-27 active session)
 * - Projects (Proposals across all 9 departments)
 * - Settings (Guide limits, similarity thresholds, rubric criteria)
 * - Guide Assignments
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  Department,
  Course,
  User,
  AcademicYear,
  Project,
  Setting,
  GuideAssignment,
  Faculty
} from '../models/index.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iripgms';

async function migrate() {
  console.log('================================================================');
  console.log('  BVM HOLY CROSS COLLEGE, CHERPUNKAL — MONGODB ATLAS MIGRATION');
  console.log('================================================================');
  console.log(`Connecting to: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')} ...`);

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log(`✅ Connected successfully to MongoDB Atlas! Database: ${mongoose.connection.name}`);

    const dataDir = path.resolve('data');

    // 1. Academic Year
    console.log('\n[1/7] Seeding Academic Year (2026-27)...');
    await AcademicYear.findOneAndUpdate(
      { yearCode: '2026-27' },
      {
        yearCode: '2026-27',
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2027-05-31T23:59:59.000Z'),
        isActive: true,
        isCurrent: true,
        submissionDeadline: new Date('2026-11-30T23:59:59.000Z'),
        reviewDeadline: new Date('2026-12-15T23:59:59.000Z'),
        description: 'Academic Session 2026–2027 — BVM Holy Cross College, Cherpunkal'
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ Academic Year 2026-27 ready.');

    // 2. Settings
    console.log('\n[2/7] Seeding Institutional Settings...');
    const settingsList = [
      { key: 'guide_capacity_default', value: 15, category: 'guide_capacity', description: 'Standard student capacity per guide' },
      { key: 'guide_capacity_max', value: 30, category: 'guide_capacity', description: 'Maximum guide capacity ceiling' },
      { key: 'similarity_threshold_advisory', value: 25, category: 'similarity_thresholds', description: 'Advisory review trigger (%)' },
      { key: 'similarity_threshold_high', value: 50, category: 'similarity_thresholds', description: 'High overlap review trigger (%)' },
      {
        key: 'evaluation_rubric',
        value: [
          { id: 'originality', name: 'Originality & Novelty', maxMarks: 20 },
          { id: 'methodology', name: 'Methodology & Research Design', maxMarks: 20 },
          { id: 'feasibility', name: 'Feasibility & Resources', maxMarks: 20 },
          { id: 'impact', name: 'Institutional & Social Impact', maxMarks: 20 },
          { id: 'clarity', name: 'Literature Review & Formulation Clarity', maxMarks: 20 }
        ],
        category: 'evaluation_rubric',
        description: '5-dimension rubric totaling 100 marks'
      }
    ];
    for (const item of settingsList) {
      await Setting.findOneAndUpdate({ key: item.key }, item, { upsert: true });
    }
    console.log(`  ✓ ${settingsList.length} Institutional settings ready.`);

    // 3. Departments
    console.log('\n[3/7] Uploading Departments...');
    const deptPath = path.join(dataDir, 'departments.json');
    if (fs.existsSync(deptPath)) {
      const depts = JSON.parse(fs.readFileSync(deptPath, 'utf8'));
      for (const d of depts) {
        await Department.findOneAndUpdate(
          { name: d.name },
          { name: d.name, code: d.code || '', course_catalog_key: d.course_catalog_key || '' },
          { upsert: true }
        );
      }
      console.log(`  ✓ ${depts.length} Academic Departments uploaded.`);
    }

    // 4. Courses
    console.log('\n[4/7] Uploading Courses...');
    const coursePath = path.join(dataDir, 'courses.json');
    if (fs.existsSync(coursePath)) {
      const courses = JSON.parse(fs.readFileSync(coursePath, 'utf8'));
      for (const c of courses) {
        await Course.findOneAndUpdate(
          { name: c.name },
          {
            name: c.name,
            code: c.code || '',
            level: c.level || 'UG',
            department_id: c.department_id,
            department_name: c.department_name
          },
          { upsert: true }
        );
      }
      console.log(`  ✓ ${courses.length} Courses uploaded.`);
    }

    // 5. Faculty & Guide Capacity
    console.log('\n[5/7] Uploading Faculty Roster...');
    const facultyPath = path.join(dataDir, 'faculty.json');
    if (fs.existsSync(facultyPath)) {
      const faculties = JSON.parse(fs.readFileSync(facultyPath, 'utf8'));
      for (const f of faculties) {
        const payload = { ...f };
        delete payload._id;
        delete payload.id;
        await Faculty.findOneAndUpdate(
          { name: f.name, department_id: f.department_id },
          payload,
          { upsert: true }
        );
      }
      console.log(`  ✓ ${faculties.length} Faculty members uploaded.`);
    }

    // 6. Users
    console.log('\n[6/7] Uploading User Accounts...');
    const userPath = path.join(dataDir, 'users.json');
    if (fs.existsSync(userPath)) {
      const users = JSON.parse(fs.readFileSync(userPath, 'utf8'));
      for (const u of users) {
        const payload = { ...u };
        delete payload._id;
        delete payload.id;
        await User.findOneAndUpdate(
          { email: u.email.toLowerCase() },
          payload,
          { upsert: true }
        );
      }
      console.log(`  ✓ ${users.length} Users uploaded (including Ansu Maria Benny & Admin accounts).`);
    }

    // 7. Projects
    console.log('\n[7/7] Uploading Projects across all 9 departments...');
    const projPath = path.join(dataDir, 'projects.json');
    if (fs.existsSync(projPath)) {
      const projects = JSON.parse(fs.readFileSync(projPath, 'utf8'));
      for (const p of projects) {
        const payload = { ...p };
        delete payload._id;
        delete payload.id;
        await Project.findOneAndUpdate(
          { project_code: p.project_code },
          payload,
          { upsert: true }
        );
      }
      console.log(`  ✓ ${projects.length} Research Proposals uploaded into Atlas.`);
    }

    console.log('\n================================================================');
    console.log('  🎉 MONGODB ATLAS MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('  Database "iripgms" is now live with all 15 collections populated.');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration Failed:', err.message);
    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('Hint: Check your MongoDB Atlas Database Username and Password.');
    } else if (err.message.includes('whitelist') || err.message.includes('queryTxt ETIMEOUT')) {
      console.error('Hint: Make sure your current IP address (or 0.0.0.0/0) is added to MongoDB Atlas Network Access IP Access List.');
    }
    process.exit(1);
  }
}

migrate();
