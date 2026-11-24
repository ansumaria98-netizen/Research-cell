import mongoose from 'mongoose';

/**
 * Course Model
 * Collection: 'courses'
 * Purpose: UG, PG and integrated academic programmes offered by BVM Holy Cross College.
 */
const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    level: {
      type: String,
      required: true,
      enum: ['UG', 'PG', 'PG / Integrated', 'Integrated', 'Doctoral'],
      default: 'UG'
    },
    department_id: {
      type: String,
      required: true,
      trim: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    department_name: {
      type: String,
      required: true,
      trim: true
    },
    duration_years: {
      type: Number,
      default: 3
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    collection: 'courses',
    timestamps: true
  }
);

courseSchema.index({ department_id: 1, name: 1 });
courseSchema.index({ code: 1 });
courseSchema.index({ is_active: 1 });

const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

export default Course;
