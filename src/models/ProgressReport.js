import mongoose from 'mongoose';

/**
 * ProgressReport Model
 * Collection: 'progressReports'
 * Purpose: Project milestones, progress updates, deliverables, challenges, and guide endorsements.
 */
const progressReportSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required']
    },
    projectCode: {
      type: String,
      required: true,
      trim: true
    },
    milestoneTitle: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true
    },
    milestoneNumber: {
      type: Number,
      default: 1,
      min: 1
    },
    percentageComplete: {
      type: Number,
      min: [0, 'Completion percentage cannot be less than 0%'],
      max: [100, 'Completion percentage cannot exceed 100%'],
      default: 0
    },
    summaryOfWork: {
      type: String,
      required: [true, 'Summary of completed work is required'],
      trim: true
    },
    deliverablesSubmitted: [
      {
        type: String,
        trim: true
      }
    ],
    challengesFaced: {
      type: String,
      default: ''
    },
    nextSteps: {
      type: String,
      default: ''
    },
    guideRemarks: {
      type: String,
      default: ''
    },
    guideApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'revision_required'],
      default: 'pending'
    },
    guideReviewedAt: {
      type: Date,
      default: null
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitting student reference is required']
    },
    submittedByName: {
      type: String,
      trim: true
    }
  },
  {
    collection: 'progressReports',
    timestamps: true
  }
);

progressReportSchema.index({ projectId: 1, milestoneNumber: 1 });
progressReportSchema.index({ submittedBy: 1 });
progressReportSchema.index({ guideApprovalStatus: 1 });

const ProgressReport = mongoose.models.ProgressReport || mongoose.model('ProgressReport', progressReportSchema);

export default ProgressReport;
