import mongoose from 'mongoose';

/**
 * AcademicYear Model
 * Collection: 'academicYears'
 * Purpose: Academic-year records, active session tracking, and submission/review deadlines.
 */
const academicYearSchema = new mongoose.Schema(
  {
    yearCode: {
      type: String,
      required: [true, 'Academic year code is required (e.g., 2026-27)'],
      unique: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isCurrent: {
      type: Boolean,
      default: false
    },
    submissionDeadline: {
      type: Date,
      default: null
    },
    reviewDeadline: {
      type: Date,
      default: null
    },
    description: {
      type: String,
      default: ''
    }
  },
  {
    collection: 'academicYears',
    timestamps: true
  }
);

academicYearSchema.index({ isActive: 1 });
academicYearSchema.index({ isCurrent: 1 });

const AcademicYear = mongoose.models.AcademicYear || mongoose.model('AcademicYear', academicYearSchema);

export default AcademicYear;
