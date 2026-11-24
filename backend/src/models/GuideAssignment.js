import mongoose from 'mongoose';

/**
 * GuideAssignment Model
 * Collection: 'guideAssignments'
 * Purpose: Guide allocation and capacity tracking with atomic concurrency control.
 */
const guideAssignmentSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty guide reference is required']
    },
    guideName: {
      type: String,
      required: true,
      trim: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required']
    },
    departmentName: {
      type: String,
      trim: true
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear'
    },
    academicYear: {
      type: String,
      default: '2026-27',
      required: true
    },
    capacity: {
      type: Number,
      required: [true, 'Guide capacity is required'],
      default: 15,
      min: [1, 'Capacity must be at least 1 student'],
      max: [30, 'Capacity cannot exceed institutional limit of 30 students']
    },
    currentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    allocatedProjects: [
      {
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Project'
        },
        projectCode: { type: String, trim: true },
        projectTitle: { type: String, trim: true },
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        studentName: { type: String, trim: true },
        allocatedAt: { type: Date, default: Date.now },
        allocatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    ],
    // Optimistic concurrency control version token
    version: {
      type: Number,
      default: 0
    }
  },
  {
    collection: 'guideAssignments',
    timestamps: true
  }
);

// Compound unique index ensuring one tracking document per guide per academic session
guideAssignmentSchema.index({ guideId: 1, academicYear: 1 }, { unique: true });
guideAssignmentSchema.index({ departmentId: 1 });
guideAssignmentSchema.index({ currentCount: 1, capacity: 1 });

/**
 * Atomic guide student allocation with server-side capacity check and concurrency lock.
 */
guideAssignmentSchema.statics.allocateStudentConcurrently = async function (guideId, academicYear, projectPayload) {
  const updated = await this.findOneAndUpdate(
    {
      guideId,
      academicYear,
      $expr: { $lt: ['$currentCount', '$capacity'] }
    },
    {
      $inc: { currentCount: 1, version: 1 },
      $push: { allocatedProjects: projectPayload }
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new Error('Guide allocation rejected: Faculty mentor has reached maximum student capacity limit.');
  }

  return updated;
};

const GuideAssignment = mongoose.models.GuideAssignment || mongoose.model('GuideAssignment', guideAssignmentSchema);

export default GuideAssignment;
