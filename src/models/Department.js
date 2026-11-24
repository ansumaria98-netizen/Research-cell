import mongoose from 'mongoose';

/**
 * Department Model
 * Collection: 'departments'
 * Purpose: Institutional department records (all 9 academic teaching departments of BVM Holy Cross College).
 */
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    course_catalog_key: {
      type: String,
      trim: true,
      default: ''
    },
    hodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    description: {
      type: String,
      default: ''
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    collection: 'departments',
    timestamps: true
  }
);

departmentSchema.index({ code: 1 });
departmentSchema.index({ is_active: 1 });

const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);

export default Department;
