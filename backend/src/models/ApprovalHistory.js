import mongoose from 'mongoose';

/**
 * ApprovalHistory Model
 * Collection: 'approvalHistory'
 * Purpose: Permanent audit trail of official RIC decisions, comments, condition letters, and version history.
 */
const approvalHistorySchema = new mongoose.Schema(
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
    decision: {
      type: String,
      enum: [
        'approved',
        'rejected',
        'changes_requested',
        'allocated',
        'ongoing',
        'completed',
        'resubmitted',
        'withdrawn'
      ],
      required: [true, 'Decision status is required']
    },
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer / council member reference is required']
    },
    decisionByName: {
      type: String,
      required: true,
      trim: true
    },
    decisionByRole: {
      type: String,
      required: true,
      trim: true
    },
    comments: {
      type: String,
      required: [true, 'Official decision remarks are required'],
      trim: true
    },
    reasons: {
      type: String,
      default: ''
    },
    conditions: {
      type: String,
      default: ''
    },
    previousStatus: {
      type: String,
      trim: true
    },
    newStatus: {
      type: String,
      trim: true
    },
    rubricAverageScore: {
      type: Number,
      min: 0,
      max: 100
    },
    majorityConsensus: {
      type: String,
      trim: true
    },
    officialLetterGenerated: {
      type: Boolean,
      default: false
    },
    officialLetterRef: {
      type: String,
      trim: true
    },
    versionNumber: {
      type: Number,
      default: 1
    },
    decidedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'approvalHistory',
    timestamps: true
  }
);

approvalHistorySchema.index({ projectId: 1, decidedAt: -1 });
approvalHistorySchema.index({ decisionBy: 1 });
approvalHistorySchema.index({ decision: 1 });

const ApprovalHistory = mongoose.models.ApprovalHistory || mongoose.model('ApprovalHistory', approvalHistorySchema);

export default ApprovalHistory;
