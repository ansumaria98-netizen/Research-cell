import mongoose from 'mongoose';

/**
 * SimilarityReport Model
 * Collection: 'similarityReports'
 * Purpose: Multi-dimensional AI comparison runs, overall scores, and matched project references.
 */
const similarityReportSchema = new mongoose.Schema(
  {
    targetProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Target project reference is required']
    },
    targetProjectCode: {
      type: String,
      required: true,
      trim: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    department: {
      type: String,
      trim: true
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear'
    },
    academicYear: {
      type: String,
      default: '2026-27'
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    scope: {
      type: String,
      enum: ['same_department', 'cross_department', 'all_institutional'],
      default: 'same_department'
    },
    dimensionScores: {
      titles: { type: Number, default: 0 },
      abstracts: { type: Number, default: 0 },
      objectives: { type: Number, default: 0 },
      methods: { type: Number, default: 0 },
      keywords: { type: Number, default: 0 },
      expectedResults: { type: Number, default: 0 }
    },
    // References to matched projects, avoiding data duplication
    matchedProjects: [
      {
        matchedProjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Project',
          required: true
        },
        matchedProjectCode: { type: String, required: true },
        matchedProjectTitle: { type: String, required: true },
        department: { type: String, trim: true },
        academicYear: { type: String, trim: true },
        score: { type: Number, required: true },
        matchCue: { type: String, default: '' },
        dimensionBreakdown: {
          titles: Number,
          abstracts: Number,
          objectives: Number,
          methods: Number,
          keywords: Number,
          expectedResults: Number
        }
      }
    ],
    status: {
      type: String,
      enum: ['cleared', 'flagged_for_review', 'high_overlap'],
      default: 'cleared'
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scannedByName: {
      type: String,
      default: 'RIC System Scanner'
    },
    scannedAt: {
      type: Date,
      default: Date.now
    },
    notice: {
      type: String,
      default: 'AI similarity checks are advisory and recorded to assist human academic evaluation. Scores never automatically reject a proposal.'
    }
  },
  {
    collection: 'similarityReports',
    timestamps: true
  }
);

similarityReportSchema.index({ targetProjectId: 1 });
similarityReportSchema.index({ department: 1, overallScore: -1 });
similarityReportSchema.index({ status: 1 });

const SimilarityReport = mongoose.models.SimilarityReport || mongoose.model('SimilarityReport', similarityReportSchema);

export default SimilarityReport;
