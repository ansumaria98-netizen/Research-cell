import express from 'express';
import {
  allocateGuideToStudent,
  getDepartmentFacultyCounts,
  listCourses,
  listDepartments,
  listFaculty,
  listGuides,
  saveCourse,
  saveDepartment,
  saveFaculty,
  updateGuideCapacity
} from '../db/institutionRepository.js';
import { listAllProjects } from '../db/projectRepository.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { UNASSIGNED_PROGRAMMES } from '../services/courseCatalog.js';
import {
  summarizeDepartmentProjects,
  validateCourseInput,
  validateDepartmentInput,
  validateFacultyInput,
  validateGuideCapacityInput
} from '../services/institution.js';

const router = express.Router();
const INSTITUTION_MANAGERS = ['ric_head', 'ric_admin', 'ric_member', 'admin'];
const requireInstitutionManager = requireRole(INSTITUTION_MANAGERS);

router.get('/departments', authenticate, async (req, res) => {
  try {
    const departments = await listDepartments();
    res.json({ departments, unassignedProgrammes: UNASSIGNED_PROGRAMMES });
  } catch (error) {
    console.error('[Department List Error]', error);
    res.status(500).json({ error: 'Failed to retrieve departments.' });
  }
});

router.post('/departments', authenticate, requireInstitutionManager, async (req, res) => {
  const { data, error } = validateDepartmentInput(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const department = await saveDepartment(data);
    res.status(201).json({ department });
  } catch (saveError) {
    if (saveError.code === 'DUPLICATE_DEPARTMENT' || saveError.code === 11000) {
      return res.status(409).json({ error: 'A department with this name or code already exists.' });
    }
    console.error('[Department Create Error]', saveError);
    res.status(500).json({ error: 'Failed to create department.' });
  }
});

router.put('/departments/:departmentId', authenticate, requireInstitutionManager, async (req, res) => {
  const { data, error } = validateDepartmentInput(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const department = await saveDepartment(data, req.params.departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found.' });
    res.json({ department });
  } catch (saveError) {
    if (saveError.code === 'DUPLICATE_DEPARTMENT' || saveError.code === 11000) {
      return res.status(409).json({ error: 'A department with this name or code already exists.' });
    }
    if (saveError.name === 'CastError') return res.status(404).json({ error: 'Department not found.' });
    console.error('[Department Update Error]', saveError);
    res.status(500).json({ error: 'Failed to update department.' });
  }
});

router.get('/faculty', authenticate, async (req, res) => {
  try {
    const departmentId = typeof req.query.department_id === 'string' ? req.query.department_id : '';
    const faculty = await listFaculty(departmentId);
    res.json({ faculty });
  } catch (error) {
    console.error('[Faculty List Error]', error);
    res.status(500).json({ error: 'Failed to retrieve permitted faculty.' });
  }
});

router.post('/faculty', authenticate, requireInstitutionManager, async (req, res) => {
  try {
    const departments = await listDepartments();
    const { data, error } = validateFacultyInput(req.body, departments);
    if (error) return res.status(400).json({ error });
    const person = await saveFaculty(data);
    res.status(201).json({ faculty: person });
  } catch (saveError) {
    console.error('[Faculty Create Error]', saveError);
    res.status(500).json({ error: 'Failed to create permitted faculty record.' });
  }
});

router.put('/faculty/:facultyId', authenticate, requireInstitutionManager, async (req, res) => {
  try {
    const departments = await listDepartments();
    const { data, error } = validateFacultyInput(req.body, departments);
    if (error) return res.status(400).json({ error });
    const person = await saveFaculty(data, req.params.facultyId);
    if (!person) return res.status(404).json({ error: 'Faculty record not found.' });
    res.json({ faculty: person });
  } catch (saveError) {
    if (saveError.name === 'CastError') return res.status(404).json({ error: 'Faculty record not found.' });
    console.error('[Faculty Update Error]', saveError);
    res.status(500).json({ error: 'Failed to update permitted faculty record.' });
  }
});

router.get('/summary', authenticate, requireInstitutionManager, async (req, res) => {
  try {
    const [departments, projects, facultyCounts] = await Promise.all([
      listDepartments(),
      listAllProjects({}, req.user),
      getDepartmentFacultyCounts()
    ]);
    const summary = summarizeDepartmentProjects(departments, projects);
    res.json({
      departments: summary.departments.map((department) => ({
        ...department,
        faculty_count: facultyCounts[department.id] || 0
      })),
      unlinked: summary.unlinked
    });
  } catch (error) {
    console.error('[Department Summary Error]', error);
    res.status(500).json({ error: 'Failed to retrieve department project summaries.' });
  }
});

// Course Management (Section 4)
router.get('/courses', authenticate, async (req, res) => {
  try {
    const departmentId = typeof req.query.department_id === 'string' ? req.query.department_id : '';
    const courses = await listCourses(departmentId);
    res.json({ courses });
  } catch (error) {
    console.error('[Course List Error]', error);
    res.status(500).json({ error: 'Failed to retrieve courses.' });
  }
});

router.post('/courses', authenticate, requireInstitutionManager, async (req, res) => {
  try {
    const departments = await listDepartments();
    const { data, error } = validateCourseInput(req.body, departments);
    if (error) return res.status(400).json({ error });
    const course = await saveCourse(data);
    res.status(201).json({ course });
  } catch (saveError) {
    console.error('[Course Create Error]', saveError);
    res.status(500).json({ error: 'Failed to create course.' });
  }
});

router.put('/courses/:courseId', authenticate, requireInstitutionManager, async (req, res) => {
  try {
    const departments = await listDepartments();
    const { data, error } = validateCourseInput(req.body, departments);
    if (error) return res.status(400).json({ error });
    const course = await saveCourse(data, req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    res.json({ course });
  } catch (saveError) {
    console.error('[Course Update Error]', saveError);
    res.status(500).json({ error: 'Failed to update course.' });
  }
});

// Guide Capacity and Allocation (Section 5)
router.get('/guides', authenticate, async (req, res) => {
  try {
    const departmentId = typeof req.query.department_id === 'string' ? req.query.department_id : '';
    const guides = await listGuides(departmentId);
    res.json({ guides });
  } catch (error) {
    console.error('[Guide List Error]', error);
    res.status(500).json({ error: 'Failed to retrieve guides.' });
  }
});

router.patch('/guides/:facultyId/capacity', authenticate, requireInstitutionManager, async (req, res) => {
  const { data, error } = validateGuideCapacityInput(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const guide = await updateGuideCapacity(req.params.facultyId, data.capacity, req.user);
    if (!guide) return res.status(404).json({ error: 'Guide record not found.' });
    res.json({ message: 'Guide capacity updated successfully.', guide });
  } catch (updateError) {
    console.error('[Guide Capacity Update Error]', updateError);
    res.status(500).json({ error: 'Failed to update guide capacity.' });
  }
});

router.post('/guides/allocate', authenticate, async (req, res) => {
  try {
    const guideId = typeof req.body.guide_id === 'string' ? req.body.guide_id.trim() : '';
    let studentId = typeof req.body.student_id === 'string' ? req.body.student_id.trim() : '';

    if (!guideId) {
      return res.status(400).json({ error: 'Select a project guide.' });
    }

    const isManager = INSTITUTION_MANAGERS.includes(req.user.role);
    if (req.user.role === 'student') {
      studentId = req.user.id;
    } else if (!isManager) {
      return res.status(403).json({ error: 'Not authorized to allocate guides.' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required for guide allocation.' });
    }

    const adminOverride = isManager && Boolean(req.body.admin_override);
    const result = await allocateGuideToStudent(guideId, studentId, {
      adminOverride,
      adminUser: req.user,
      reason: req.body.reason || (isManager ? 'Administrator guide allocation' : 'Student guide selection'),
      projectCode: req.body.project_code,
      projectTitle: req.body.project_title,
      academicYear: req.body.academic_year
    });

    if (result.error) {
      return res.status(result.status || 400).json({
        error: result.error,
        current_count: result.current_count,
        capacity: result.capacity
      });
    }

    res.json({
      message: 'Guide successfully allocated.',
      guide: result.guide,
      student: result.student
    });
  } catch (allocError) {
    console.error('[Guide Allocation Error]', allocError);
    res.status(500).json({ error: 'Failed to complete guide allocation.' });
  }
});

export default router;
