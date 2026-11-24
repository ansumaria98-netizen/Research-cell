import mongoose from 'mongoose';

/**
 * Evaluation Model
 * Collection: 'evaluations'
 * Purpose: Guide and RIC committee review records, fixed 5-criteria rubric scoring (0-20 each, 100 total).
 */
const evaluationSchema = new mongoose.Schema(
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
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer reference is required']
    },
    reviewerName: {
      type: String,
      required: true,
      trim: true
    },
    reviewerRole: {
      type: String,
      enum: ['guide', 'ric_member', 'ric_head'],
      required: true
    },
    rubricScores: {
      originalityNovelty: {
        type: Number,
        min: 0,
        max: 20,
        default: 0
      },
      methodologyDesign: {
        type: Number,
        min: 0,
        max: 20,
        default: 0
      },
      feasibilityResources: {
        type: Number,
        min: 0,
        max: 20,
        default: 0
      },
      institutionalSocialImpact: {
        type: Number,
        min: 0,
        max: 20,
        default: 0
      },
      literatureClarity: {
        type: Number,
        min: 0,
        max: 20,
        default: 0
      }
    },
    totalScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    recommendation: {
      type: String,
      enum: ['approve', 'minor_revision', 'major_revision', 'reject', 'defer'],
      required: [true, 'Review recommendation is required']
    },
    comments: {
      type: String,
      required: [true, 'Evaluation remarks are required'],
      trim: true
    },
    confidentialNotes: {
      type: String,
      default: ''
    },
    evaluatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'evaluations',
    timestamps: true
  }
);

// Pre-save hook: automatically compute totalScore from rubric dimensions
evaluationSchema.pre('save', function (next) {
  if (this.rubricScores) {
    const { originalityNovelty, methodologyDesign, feasibilityResources, institutionalSocialImpact, literatureClarity } = this.rubricScores;
    this.totalScore =
      (Number(originalityNovelty) || 0) +
      (Number(methodologyDesign) || 0) +
      (Number(feasibilityResources) || 0) +
      (Number(institutionalSocialImpact) || 0) +
      (Number(literatureClarity) || 0);
  }
  next();
});

evaluationSchema.index({ projectId: 1, reviewerId: 1 });
evaluationSchema.index({ projectId: 1, reviewerRole: 1 });
evaluationSchema.index({ totalScore: -1 });

const Evaluation = mongoose.models.Evaluation || mongoose.model('Evaluation', evaluationSchema);

export default Evaluation;
