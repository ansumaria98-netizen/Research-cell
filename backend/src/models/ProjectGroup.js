import mongoose from 'mongoose';

/**
 * ProjectGroup Model
 * Collection: 'projectGroups'
 * Purpose: Student membership in group projects, team roles, and collaborative tracking.
 */
const projectGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Associated project reference is required']
    },
    projectCode: {
      type: String,
      trim: true
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Group leader student ID is required']
    },
    members: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        studentName: { type: String, trim: true },
        registerNumber: { type: String, trim: true },
        role: {
          type: String,
          enum: ['leader', 'member', 'co-investigator'],
          default: 'member'
        },
        joinedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required']
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear'
    },
    academicYear: {
      type: String,
      default: '2026-27'
    },
    maxMembers: {
      type: Number,
      default: 4,
      min: 1,
      max: 8
    },
    status: {
      type: String,
      enum: ['active', 'dissolved', 'archived'],
      default: 'active'
    }
  },
  {
    collection: 'projectGroups',
    timestamps: true
  }
);

projectGroupSchema.index({ projectId: 1 });
projectGroupSchema.index({ leaderId: 1 });
projectGroupSchema.index({ 'members.studentId': 1 });
projectGroupSchema.index({ departmentId: 1, academicYear: 1 });

const ProjectGroup = mongoose.models.ProjectGroup || mongoose.model('ProjectGroup', projectGroupSchema);

export default ProjectGroup;
