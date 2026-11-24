import mongoose from 'mongoose';
import {
  AcademicYear,
  Setting,
  Department,
  Course,
  User,
  Project
} from '../models/index.js';

/**
 * Initialize and seed initial data for the 15 MongoDB collections if empty.
 */
export async function seedInstitutionalCollectionsIfEmpty() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    // 1. Seed Active Academic Year (2026-27)
    const activeYearCount = await AcademicYear.countDocuments();
    if (activeYearCount === 0) {
      await AcademicYear.create({
        yearCode: '2026-27',
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2027-05-31T23:59:59.000Z'),
        isActive: true,
        isCurrent: true,
        submissionDeadline: new Date('2026-11-30T23:59:59.000Z'),
        reviewDeadline: new Date('2026-12-15T23:59:59.000Z'),
        description: 'Academic Session 2026–2027 — BVM Holy Cross College, Cherpunkal'
      });
      console.log('[DB] Seeded initial active Academic Year: 2026-27');
    }

    // 2. Seed Default Institutional Settings
    const settingsCount = await Setting.countDocuments();
    if (settingsCount === 0) {
      await Setting.insertMany([
        {
          key: 'guide_capacity_default',
          value: 15,
          category: 'guide_capacity',
          description: 'Standard student capacity limit allocated to a faculty mentor.'
        },
        {
          key: 'guide_capacity_max',
          value: 30,
          category: 'guide_capacity',
          description: 'Maximum institutional guide capacity ceiling requiring administrator override.'
        },
        {
          key: 'similarity_threshold_advisory',
          value: 25,
          category: 'similarity_thresholds',
          description: 'Advisory similarity percentage triggering yellow badge for committee attention.'
        },
        {
          key: 'similarity_threshold_high',
          value: 50,
          category: 'similarity_thresholds',
          description: 'High similarity percentage triggering red badge and mandatory committee scrutiny.'
        },
        {
          key: 'evaluation_rubric',
          value: [
            { id: 'originality', name: 'Originality & Novelty', maxMarks: 20 },
            { id: 'methodology', name: 'Methodology & Research Design', maxMarks: 20 },
            { id: 'feasibility', name: 'Feasibility & Resource Allocation', maxMarks: 20 },
            { id: 'impact', name: 'Institutional & Social Impact', maxMarks: 20 },
            { id: 'clarity', name: 'Literature Review & Formulation Clarity', maxMarks: 20 }
          ],
          category: 'evaluation_rubric',
          description: 'Official 5-dimension rubric criteria totaling 100 marks.'
        }
      ]);
      console.log('[DB] Seeded institutional default settings.');
    }
  } catch (err) {
    console.warn('[DB] Notice during institutional collection seeding:', err.message);
  }
}
