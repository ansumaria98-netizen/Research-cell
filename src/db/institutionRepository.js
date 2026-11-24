import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Department from '../models/Department.js';
import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { isMongoDBConnected } from './connect.js';
import {
  attachCourseProgrammes,
  reconcileCourseCatalogDepartments
} from '../services/courseCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const LOCAL_FACULTY_FILE = path.join(DATA_DIR, 'faculty.json');
const LOCAL_COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const LOCAL_USERS_FILE = path.join(DATA_DIR, 'users.json');
const CODE_INDEX_NAME = 'department_code_nonempty_unique';
const seededCatalogStores = new Set();
const catalogSeedPromises = new Map();
const initializedCodeIndexes = new Set();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readRecords(filePath) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : [];
  } catch (error) {
    console.error('[InstitutionRepository] Read error:', error.message);
    return [];
  }
}

function writeRecords(filePath, records) {
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
}

function normalizeRecord(record) {
  const id = record._id ? record._id.toString() : record.id;
  return { ...record, code: record.code || '', id, _id: id };
}

function duplicateDepartment(departments, candidate, excludedId = '') {
  return departments.some((department) =>
    department.id !== excludedId &&
    ((candidate.code &&
      String(department.code || '').toLowerCase() === candidate.code.toLowerCase()) ||
      department.name.toLowerCase() === candidate.name.toLowerCase())
  );
}

async function ensureDepartmentCodeIndex() {
  if (!isMongoDBConnected()) return;
  const storeKey = 'mongodb';
  if (initializedCodeIndexes.has(storeKey)) return;

  const collection = Department.collection;
  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
  }

  const legacyCodeIndex = indexes.find((index) =>
    index.name === 'code_1' && index.unique
  );
  if (legacyCodeIndex) {
    await collection.dropIndex(legacyCodeIndex.name);
    indexes = indexes.filter((index) => index.name !== legacyCodeIndex.name);
  }

  if (!indexes.some((index) => index.name === CODE_INDEX_NAME)) {
    await collection.createIndex(
      { code: 1 },
      {
        name: CODE_INDEX_NAME,
        unique: true,
        partialFilterExpression: { code: { $type: 'string', $gt: '' } }
      }
    );
  }
  initializedCodeIndexes.add(storeKey);
}

async function readDepartmentRecords() {
  return isMongoDBConnected()
    ? (await Department.find().lean()).map(normalizeRecord)
    : readRecords(LOCAL_DEPARTMENTS_FILE).map(normalizeRecord);
}

async function persistCourseCatalogDepartments() {
  const isMongo = isMongoDBConnected();
  const storeKey = isMongo ? 'mongodb' : 'local';
  if (seededCatalogStores.has(storeKey)) return;
  if (catalogSeedPromises.has(storeKey)) return catalogSeedPromises.get(storeKey);

  const seedPromise = (async () => {
    const rawLocalRecords = isMongo ? null : readRecords(LOCAL_DEPARTMENTS_FILE);
    const existing = isMongo
      ? await readDepartmentRecords()
      : rawLocalRecords.map(normalizeRecord);
    const reconciled = reconcileCourseCatalogDepartments(existing);
    const existingById = new Map(existing.map((department) => [department.id, department]));
    const additions = reconciled.filter((department) => !department.id);
    const keyUpdates = reconciled.filter((department) => {
      const previous = existingById.get(department.id);
      return previous &&
        previous.course_catalog_key !== department.course_catalog_key &&
        department.course_catalog_key;
    });

    if (isMongo) {
      for (const department of keyUpdates) {
        await Department.updateOne(
          { _id: department.id },
          { $set: { course_catalog_key: department.course_catalog_key } }
        );
      }
      if (additions.length) {
        await Department.insertMany(additions.map(({ name, code, course_catalog_key }) => ({
          name,
          code,
          course_catalog_key
        })));
      }
    } else if (additions.length || keyUpdates.length) {
      const records = rawLocalRecords.map((record) => {
        const id = record._id || record.id;
        const updated = keyUpdates.find((item) => item.id === id);
        return updated
          ? { ...record, course_catalog_key: updated.course_catalog_key, updatedAt: new Date().toISOString() }
          : record;
      });
      const now = new Date().toISOString();
      additions.forEach((department) => records.push({
        ...department,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now
      }));
      writeRecords(LOCAL_DEPARTMENTS_FILE, records);
    }

    seededCatalogStores.add(storeKey);
  })();

  catalogSeedPromises.set(storeKey, seedPromise);
  try {
    await seedPromise;
  } finally {
    catalogSeedPromises.delete(storeKey);
  }
}

export async function listDepartments() {
  await ensureDepartmentCodeIndex();
  await persistCourseCatalogDepartments();
  const departments = await readDepartmentRecords();
  return departments
    .map(attachCourseProgrammes)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveDepartment(data, id = '') {
  const departments = await listDepartments();
  if (duplicateDepartment(departments, data, id)) {
    const error = new Error('A department with this name or code already exists.');
    error.code = 'DUPLICATE_DEPARTMENT';
    throw error;
  }

  if (isMongoDBConnected()) {
    if (id) {
      const department = await Department.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();
      return department ? normalizeRecord(department) : null;
    }
    return normalizeRecord((await Department.create(data)).toObject());
  }

  const records = readRecords(LOCAL_DEPARTMENTS_FILE);
  const index = records.findIndex((department) => (department.id || department._id) === id);
  const now = new Date().toISOString();
  if (id && index === -1) return null;
  const saved = {
    ...(index >= 0 ? records[index] : {}),
    ...data,
    id: index >= 0 ? id : randomUUID(),
    createdAt: index >= 0 ? records[index].createdAt : now,
    updatedAt: now
  };
  if (index >= 0) records[index] = saved;
  else records.push(saved);
  writeRecords(LOCAL_DEPARTMENTS_FILE, records);
  return normalizeRecord(saved);
}

export async function listFaculty(departmentId = '') {
  const faculty = isMongoDBConnected()
    ? await Faculty.find(departmentId ? { department_id: departmentId } : {}).sort({ name: 1 }).lean()
    : readRecords(LOCAL_FACULTY_FILE).filter((person) =>
      !departmentId || person.department_id === departmentId
    );
  return faculty.map(normalizeRecord).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveFaculty(data, id = '') {
  if (isMongoDBConnected()) {
    if (id) {
      const person = await Faculty.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();
      return person ? normalizeRecord(person) : null;
    }
    return normalizeRecord((await Faculty.create(data)).toObject());
  }

  const records = readRecords(LOCAL_FACULTY_FILE);
  const index = records.findIndex((person) => (person.id || person._id) === id);
  const now = new Date().toISOString();
  if (id && index === -1) return null;
  const saved = {
    ...(index >= 0 ? records[index] : {}),
    ...data,
    id: index >= 0 ? id : randomUUID(),
    is_active: index >= 0 ? records[index].is_active !== false : true,
    createdAt: index >= 0 ? records[index].createdAt : now,
    updatedAt: now
  };
  if (index >= 0) records[index] = saved;
  else records.push(saved);
  writeRecords(LOCAL_FACULTY_FILE, records);
  return normalizeRecord(saved);
}

export async function getDepartmentFacultyCounts() {
  const faculty = await listFaculty();
  return faculty.reduce((counts, person) => {
    counts[person.department_id] = (counts[person.department_id] || 0) + 1;
    return counts;
  }, {});
}

export async function listCourses(departmentId = '') {
  if (isMongoDBConnected()) {
    const query = departmentId ? { department_id: departmentId, is_active: true } : { is_active: true };
    const courses = await Course.find(query).sort({ name: 1 }).lean();
    return courses.map(normalizeRecord);
  }
  const records = readRecords(LOCAL_COURSES_FILE);
  return records
    .filter((c) => (!departmentId || c.department_id === departmentId) && c.is_active !== false)
    .map(normalizeRecord)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCourse(data, id = '') {
  const isMongo = isMongoDBConnected();
  if (isMongo) {
    if (id) {
      const course = await Course.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();
      return course ? normalizeRecord(course) : null;
    }
    return normalizeRecord((await Course.create(data)).toObject());
  }

  const records = readRecords(LOCAL_COURSES_FILE);
  const index = records.findIndex((c) => (c.id || c._id) === id);
  const now = new Date().toISOString();
  if (id && index === -1) return null;
  const saved = {
    ...(index >= 0 ? records[index] : {}),
    ...data,
    id: index >= 0 ? id : (data.id || `crs_${randomUUID().slice(0, 8)}`),
    is_active: index >= 0 ? records[index].is_active !== false : (data.is_active !== false),
    createdAt: index >= 0 ? records[index].createdAt : now,
    updatedAt: now
  };
  if (index >= 0) records[index] = saved;
  else records.push(saved);
  writeRecords(LOCAL_COURSES_FILE, records);
  return normalizeRecord(saved);
}

export async function listGuides(departmentId = '') {
  const faculty = await listFaculty(departmentId);
  return faculty.map((person) => {
    const capacity = Number(person.guide_capacity) || 15;
    const allocatedStudents = Array.isArray(person.allocated_students) ? person.allocated_students : [];
    const count = allocatedStudents.length || Number(person.allocated_student_count) || 0;
    const remaining = Math.max(0, capacity - count);
    return {
      ...person,
      guide_capacity: capacity,
      allocated_student_count: count,
      allocated_students: allocatedStudents,
      remaining_capacity: remaining,
      is_full: remaining <= 0
    };
  });
}

export async function updateGuideCapacity(facultyId, newCapacity, user = null) {
  const cap = Number(newCapacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > 30) {
    const err = new Error('Guide capacity must be an integer between 1 and 30.');
    err.code = 'INVALID_CAPACITY';
    throw err;
  }

  if (isMongoDBConnected()) {
    const person = await Faculty.findById(facultyId);
    if (!person) return null;
    person.guide_capacity = cap;
    if (!Array.isArray(person.allocation_history)) person.allocation_history = [];
    person.allocation_history.push({
      action: 'capacity_updated',
      reason: `Guide capacity updated to ${cap} students`,
      changed_by: user ? user.name : 'Administrator',
      changed_at: new Date()
    });
    await person.save();
    return normalizeRecord(person.toObject());
  }

  const records = readRecords(LOCAL_FACULTY_FILE);
  const index = records.findIndex((p) => (p.id || p._id) === facultyId);
  if (index === -1) return null;
  const person = records[index];
  person.guide_capacity = cap;
  if (!Array.isArray(person.allocation_history)) person.allocation_history = [];
  person.allocation_history.push({
    action: 'capacity_updated',
    reason: `Guide capacity updated to ${cap} students`,
    changed_by: user ? user.name : 'Administrator',
    changed_at: new Date().toISOString()
  });
  person.updatedAt = new Date().toISOString();
  records[index] = person;
  writeRecords(LOCAL_FACULTY_FILE, records);
  return normalizeRecord(person);
}

export async function allocateGuideToStudent(guideId, studentId, options = {}) {
  const adminOverride = Boolean(options.adminOverride || options.admin_override);
  const now = new Date().toISOString();

  if (isMongoDBConnected()) {
    const guide = await Faculty.findById(guideId);
    if (!guide) return { error: 'Faculty guide record not found.', status: 404 };

    const studentUser = await User.findById(studentId);
    if (!studentUser) return { error: 'Student account not found.', status: 404 };

    const currentCount = Array.isArray(guide.allocated_students) ? guide.allocated_students.length : 0;
    const capacity = Number(guide.guide_capacity) || 15;

    if (currentCount >= capacity && !adminOverride) {
      return {
        error: `Guide capacity reached (${capacity} students maximum). Allocation blocked without administrator override.`,
        status: 400,
        current_count: currentCount,
        capacity
      };
    }

    const prevGuides = await Faculty.find({ 'allocated_students.student_id': studentId });
    for (const prevGuide of prevGuides) {
      if (prevGuide._id.toString() !== guide._id.toString()) {
        prevGuide.allocated_students = prevGuide.allocated_students.filter((s) => s.student_id !== studentId);
        prevGuide.allocated_student_count = prevGuide.allocated_students.length;
        if (!Array.isArray(prevGuide.allocation_history)) prevGuide.allocation_history = [];
        prevGuide.allocation_history.push({
          action: 'reassigned',
          student_id: studentId,
          student_name: studentUser.name,
          register_number: studentUser.register_number || '',
          reason: options.reason || `Reassigned to ${guide.name}`,
          changed_by: options.adminUser ? options.adminUser.name : studentUser.name,
          changed_at: new Date()
        });
        await prevGuide.save();
      }
    }

    if (!Array.isArray(guide.allocated_students)) guide.allocated_students = [];
    guide.allocated_students = guide.allocated_students.filter((s) => s.student_id !== studentId);
    guide.allocated_students.push({
      student_id: studentId,
      student_name: studentUser.name,
      register_number: studentUser.register_number || '',
      project_code: options.projectCode || options.project_code || '',
      project_title: options.projectTitle || options.project_title || '',
      academic_year: options.academicYear || options.academic_year || studentUser.academic_year || '2026-27',
      allocated_at: new Date(),
      allocated_by: options.adminUser ? options.adminUser.name : studentUser.name
    });
    guide.allocated_student_count = guide.allocated_students.length;
    if (!Array.isArray(guide.allocation_history)) guide.allocation_history = [];
    guide.allocation_history.push({
      action: 'allocated',
      student_id: studentId,
      student_name: studentUser.name,
      register_number: studentUser.register_number || '',
      reason: options.reason || 'Guide allocation confirmed',
      changed_by: options.adminUser ? options.adminUser.name : studentUser.name,
      changed_at: new Date()
    });
    await guide.save();

    studentUser.allocated_guide_id = guide._id.toString();
    studentUser.allocated_guide_name = guide.name;
    await studentUser.save();

    return {
      success: true,
      guide: normalizeRecord(guide.toObject()),
      student: {
        id: studentUser._id.toString(),
        name: studentUser.name,
        allocated_guide_id: guide._id.toString(),
        allocated_guide_name: guide.name
      }
    };
  }

  // Local JSON Store
  const facultyRecords = readRecords(LOCAL_FACULTY_FILE);
  const guideIndex = facultyRecords.findIndex((p) => (p.id || p._id) === guideId);
  if (guideIndex === -1) return { error: 'Faculty guide record not found.', status: 404 };
  const guide = facultyRecords[guideIndex];

  const userRecords = readRecords(LOCAL_USERS_FILE);
  const studentIndex = userRecords.findIndex((u) => (u.id || u._id) === studentId);
  if (studentIndex === -1) return { error: 'Student account not found.', status: 404 };
  const studentUser = userRecords[studentIndex];

  if (!Array.isArray(guide.allocated_students)) guide.allocated_students = [];
  if (!Array.isArray(guide.allocation_history)) guide.allocation_history = [];

  const currentCount = guide.allocated_students.length;
  const capacity = Number(guide.guide_capacity) || 15;

  if (currentCount >= capacity && !adminOverride) {
    return {
      error: `Guide capacity reached (${capacity} students maximum). Allocation blocked without administrator override.`,
      status: 400,
      current_count: currentCount,
      capacity
    };
  }

  // Remove from any prior guide
  facultyRecords.forEach((otherGuide) => {
    if ((otherGuide.id || otherGuide._id) !== guideId && Array.isArray(otherGuide.allocated_students)) {
      const had = otherGuide.allocated_students.some((s) => s.student_id === studentId);
      if (had) {
        otherGuide.allocated_students = otherGuide.allocated_students.filter((s) => s.student_id !== studentId);
        otherGuide.allocated_student_count = otherGuide.allocated_students.length;
        if (!Array.isArray(otherGuide.allocation_history)) otherGuide.allocation_history = [];
        otherGuide.allocation_history.push({
          action: 'reassigned',
          student_id: studentId,
          student_name: studentUser.name,
          register_number: studentUser.register_number || '',
          reason: options.reason || `Reassigned to ${guide.name}`,
          changed_by: options.adminUser ? options.adminUser.name : studentUser.name,
          changed_at: now
        });
      }
    }
  });

  guide.allocated_students = guide.allocated_students.filter((s) => s.student_id !== studentId);
  guide.allocated_students.push({
    student_id: studentId,
    student_name: studentUser.name,
    register_number: studentUser.register_number || '',
    project_code: options.projectCode || options.project_code || '',
    project_title: options.projectTitle || options.project_title || '',
    academic_year: options.academicYear || options.academic_year || studentUser.academic_year || '2026-27',
    allocated_at: now,
    allocated_by: options.adminUser ? options.adminUser.name : studentUser.name
  });
  guide.allocated_student_count = guide.allocated_students.length;
  guide.allocation_history.push({
    action: 'allocated',
    student_id: studentId,
    student_name: studentUser.name,
    register_number: studentUser.register_number || '',
    reason: options.reason || 'Guide allocation confirmed',
    changed_by: options.adminUser ? options.adminUser.name : studentUser.name,
    changed_at: now
  });
  guide.updatedAt = now;

  facultyRecords[guideIndex] = guide;
  writeRecords(LOCAL_FACULTY_FILE, facultyRecords);

  // Update user record
  studentUser.allocated_guide_id = guide.id || guide._id;
  studentUser.allocated_guide_name = guide.name;
  studentUser.updatedAt = now;
  userRecords[studentIndex] = studentUser;
  writeRecords(LOCAL_USERS_FILE, userRecords);

  return {
    success: true,
    guide: normalizeRecord(guide),
    student: {
      id: studentUser.id || studentUser._id,
      name: studentUser.name,
      allocated_guide_id: guide.id || guide._id,
      allocated_guide_name: guide.name
    }
  };
}
