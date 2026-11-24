import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listCourses,
  saveCourse,
  listGuides,
  updateGuideCapacity,
  allocateGuideToStudent
} from '../src/db/institutionRepository.js';
import {
  validateCourseInput,
  validateGuideCapacityInput
} from '../src/services/institution.js';

const mockDepartments = [
  { id: 'dept-ca', name: 'Department of Computer Applications', code: 'CA' },
  { id: 'dept-cs', name: 'Department of Computer Science', code: 'CS' }
];

test('Master Courses: validateCourseInput validates required fields, level and department', () => {
  // Valid course input
  const valid = validateCourseInput({
    name: 'Bachelor in Computer Applications (BCA Honours)',
    code: 'BCA',
    level: 'UG',
    department_id: 'dept-ca'
  }, mockDepartments);
  assert.equal(valid.error, undefined);
  assert.equal(valid.data.name, 'Bachelor in Computer Applications (BCA Honours)');
  assert.equal(valid.data.code, 'BCA');
  assert.equal(valid.data.level, 'UG');
  assert.equal(valid.data.department_name, 'Department of Computer Applications');

  // Missing name
  const missingName = validateCourseInput({
    name: '',
    level: 'UG',
    department_id: 'dept-ca'
  }, mockDepartments);
  assert.match(missingName.error, /Course name is required/i);

  // Invalid level
  const invalidLevel = validateCourseInput({
    name: 'Test Course',
    level: 'Doctorate',
    department_id: 'dept-ca'
  }, mockDepartments);
  assert.match(invalidLevel.error, /Course level must be one of/i);

  // Unknown department
  const unknownDept = validateCourseInput({
    name: 'Test Course',
    level: 'PG',
    department_id: 'dept-unknown'
  }, mockDepartments);
  assert.match(unknownDept.error, /Choose an existing department/i);
});

test('Master Courses: listCourses retrieves 13 official courses and filters by department', async () => {
  const allCourses = await listCourses();
  assert.ok(allCourses.length >= 13, `Expected at least 13 courses, got ${allCourses.length}`);

  // Check specific courses exist
  const bca = allCourses.find((c) => c.name.includes('BCA') || c.code === 'BCA');
  assert.ok(bca, 'BCA Honours should be present');

  const mca = allCourses.find((c) => c.name.includes('Master of Computer Applications') || c.code === 'MCA');
  assert.ok(mca, 'MCA should be present');

  const intCs = allCourses.find((c) => c.name.includes('Integrated M.Sc.') || c.level === 'PG / Integrated');
  assert.ok(intCs, 'Integrated M.Sc. should be present with level PG / Integrated');

  // Department filter
  const caCourses = await listCourses('dept-ca');
  assert.ok(caCourses.length >= 2, 'Department of Computer Applications should have at least 2 courses');
  assert.ok(caCourses.every((c) => c.department_id === 'dept-ca'));
});

test('Guide Capacity: validateGuideCapacityInput enforces integer between 1 and 30', () => {
  assert.equal(validateGuideCapacityInput({ capacity: 15 }).data.capacity, 15);
  assert.equal(validateGuideCapacityInput({ capacity: '12' }).data.capacity, 12);
  assert.match(validateGuideCapacityInput({ capacity: 0 }).error, /between 1 and 30/i);
  assert.match(validateGuideCapacityInput({ capacity: 35 }).error, /between 1 and 30/i);
  assert.match(validateGuideCapacityInput({ capacity: 'abc' }).error, /between 1 and 30/i);
});

test('Guide Capacity & Allocation: listGuides returns live capacity and allocation status', async () => {
  const guides = await listGuides('dept-ca');
  assert.ok(guides.length > 0, 'Should return faculty guides for dept-ca');
  const guide = guides[0];
  assert.equal(typeof guide.guide_capacity, 'number');
  assert.ok(guide.guide_capacity >= 1 && guide.guide_capacity <= 30);
  assert.equal(typeof guide.allocated_student_count, 'number');
  assert.equal(typeof guide.remaining_capacity, 'number');
  assert.equal(typeof guide.is_full, 'boolean');
});

test('Guide Capacity & Allocation: blocks allocation when capacity reached unless admin override is set', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const facultyPath = path.resolve('data/faculty.json');
  const usersPath = path.resolve('data/users.json');

  const guides = await listGuides('dept-ca');
  assert.ok(guides.length > 0);
  const targetGuide = guides[0];

  // Clean slate for test guide
  const facultyList = JSON.parse(fs.readFileSync(facultyPath, 'utf-8'));
  const fIdx = facultyList.findIndex((f) => f.id === targetGuide.id);
  if (fIdx >= 0) {
    facultyList[fIdx].allocated_students = [];
    facultyList[fIdx].allocated_student_count = 0;
    facultyList[fIdx].guide_capacity = 1;
    fs.writeFileSync(facultyPath, JSON.stringify(facultyList, null, 2), 'utf-8');
  }

  // Allocate first student
  const student1Id = 'usr_test_student_1_' + Date.now();
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  users.push({
    id: student1Id,
    _id: student1Id,
    name: 'Test Student One',
    email: `test1_${Date.now()}@college.edu`,
    role: 'student',
    register_number: 'BVM2026TEST01',
    academic_year: '2026-27'
  });
  const student2Id = 'usr_test_student_2_' + Date.now();
  users.push({
    id: student2Id,
    _id: student2Id,
    name: 'Test Student Two',
    email: `test2_${Date.now()}@college.edu`,
    role: 'student',
    register_number: 'BVM2026TEST02',
    academic_year: '2026-27'
  });
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');

  try {
    // Allocate student 1 -> Should succeed
    const alloc1 = await allocateGuideToStudent(targetGuide.id, student1Id, {
      projectCode: 'TEST/001',
      projectTitle: 'Test Project 1'
    });
    assert.equal(alloc1.success, true);
    assert.equal(alloc1.guide.allocated_student_count, 1);

    // Allocate student 2 without override -> Should be BLOCKED
    const alloc2 = await allocateGuideToStudent(targetGuide.id, student2Id, {
      projectCode: 'TEST/002',
      projectTitle: 'Test Project 2'
    });
    assert.ok(alloc2.error, 'Should block allocation when guide capacity reached');
    assert.match(alloc2.error, /capacity reached/i);

    // Allocate student 2 WITH admin override -> Should SUCCEED
    const alloc2Override = await allocateGuideToStudent(targetGuide.id, student2Id, {
      adminOverride: true,
      adminUser: { name: 'Dr. Mathew Joseph (Head, RIC)' },
      reason: 'RIC Head Special Approval'
    });
    assert.equal(alloc2Override.success, true);
    assert.equal(alloc2Override.guide.allocated_student_count, 2);
  } finally {
    // Restore capacity to 15 and clean test allocations
    const facultyRestored = JSON.parse(fs.readFileSync(facultyPath, 'utf-8'));
    const fIdxRestored = facultyRestored.findIndex((f) => f.id === targetGuide.id);
    if (fIdxRestored >= 0) {
      facultyRestored[fIdxRestored].allocated_students = [];
      facultyRestored[fIdxRestored].allocated_student_count = 0;
      facultyRestored[fIdxRestored].guide_capacity = 15;
      fs.writeFileSync(facultyPath, JSON.stringify(facultyRestored, null, 2), 'utf-8');
    }
    // Clean test users
    const usersCleaned = JSON.parse(fs.readFileSync(usersPath, 'utf-8')).filter(
      (u) => u.id !== student1Id && u.id !== student2Id
    );
    fs.writeFileSync(usersPath, JSON.stringify(usersCleaned, null, 2), 'utf-8');
    const backendUsersPath = path.resolve('backend/data/users.json');
    if (fs.existsSync(backendUsersPath)) {
      const bUsersCleaned = JSON.parse(fs.readFileSync(backendUsersPath, 'utf-8')).filter(
        (u) => u.id !== student1Id && u.id !== student2Id
      );
      fs.writeFileSync(backendUsersPath, JSON.stringify(bUsersCleaned, null, 2), 'utf-8');
    }
  }
});
