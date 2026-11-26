import mongoose from 'mongoose';

/**
 * User Model
 * Collection: 'users'
 * Purpose: Student, guide, RIC committee member, faculty, principal and administrator accounts.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password_hash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    role: {
      type: String,
      enum: [
        'student',            // Student
        'guide',              // Project Guide / Staff
        'faculty_principal',  // Staff (Teaching Faculty / Mentors)
        'ric_member',         // RIC Member
        'ric_head',           // RIC Member (legacy alias)
        'admin',              // RIC Administrator
        'ric_admin',          // RIC Administrator (legacy alias)
        'institutional_user'  // Staff (legacy alias)
      ],
      default: 'student',
      required: true
    },
    designation: {
      type: String,
      trim: true,
      default: 'Student Researcher'
    },
    department: {
      type: String,
      trim: true,
      default: 'Department of Computer Applications'
    },
    department_id: {
      type: String,
      trim: true,
      default: ''
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    register_number: {
      type: String,
      trim: true,
      default: ''
    },
    course: {
      type: String,
      trim: true,
      default: ''
    },
    programme: {
      type: String,
      trim: true,
      default: ''
    },
    course_id: {
      type: String,
      trim: true,
      default: ''
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    academic_year: {
      type: String,
      trim: true,
      default: '2026-27'
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear'
    },
    allocated_guide_id: {
      type: String,
      trim: true,
      default: ''
    },
    allocated_guide_name: {
      type: String,
      trim: true,
      default: ''
    },
    assignedGuideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    is_active: {
      type: Boolean,
      default: true
    },
    reset_token: {
      type: String,
      default: null
    },
    reset_token_expires: {
      type: Date,
      default: null
    },
    last_login: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'users',
    timestamps: true
  }
);

userSchema.index({ role: 1, department: 1 });
userSchema.index({ register_number: 1 }, { sparse: true });
userSchema.index({ is_active: 1 });

// Helper method to return user profile without password hash
userSchema.methods.toProfileJSON = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    designation: this.designation,
    department: this.department,
    department_id: this.department_id,
    departmentId: this.departmentId,
    register_number: this.register_number,
    course: this.course,
    course_id: this.course_id,
    courseId: this.courseId,
    academic_year: this.academic_year,
    academicYearId: this.academicYearId,
    allocated_guide_id: this.allocated_guide_id,
    allocated_guide_name: this.allocated_guide_name,
    assignedGuideId: this.assignedGuideId,
    is_active: this.is_active,
    last_login: this.last_login,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
