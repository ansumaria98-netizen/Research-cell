import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    designation: { type: String, required: true, trim: true },
    department_id: { type: String, required: true, trim: true },
    is_active: { type: Boolean, default: true },
    // Guide Capacity and Allocation (Section 5)
    guide_capacity: {
      type: Number,
      default: 15,
      min: 1,
      max: 30
    },
    allocated_student_count: {
      type: Number,
      default: 0
    },
    allocated_students: {
      type: [
        {
          student_id: String,
          student_name: String,
          register_number: String,
          project_code: String,
          project_title: String,
          academic_year: String,
          allocated_at: { type: Date, default: Date.now },
          allocated_by: String
        }
      ],
      default: []
    },
    allocation_history: {
      type: [
        {
          action: String, // 'allocated', 'reassigned', 'removed'
          student_id: String,
          student_name: String,
          register_number: String,
          previous_guide_id: String,
          previous_guide_name: String,
          reason: String,
          changed_by: String,
          changed_at: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

facultySchema.index({ department_id: 1, name: 1 });

const Faculty = mongoose.model('Faculty', facultySchema);

export default Faculty;
