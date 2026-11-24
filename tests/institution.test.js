import assert from 'node:assert/strict';
import test from 'node:test';
import institutionRoutes from '../src/routes/institution.js';
import {
  summarizeDepartmentProjects,
  validateDepartmentInput,
  validateFacultyInput,
  validateProjectAssignment
} from '../src/services/institution.js';
import {
  COURSE_CATALOG,
  UNASSIGNED_PROGRAMMES,
  reconcileCourseCatalogDepartments
} from '../src/services/courseCatalog.js';

const departments = [
  { id: 'dept-bio', name: 'Biology', code: 'BIO' },
  { id: 'dept-chem', name: 'Chemistry', code: 'CHEM' }
];
const faculty = [
  { id: 'faculty-1', department_id: 'dept-bio', name: 'Dr. Ada Rao', designation: 'Professor' },
  { id: 'faculty-2', department_id: 'dept-bio', name: 'Dr. Ben Das', designation: 'Associate Professor' },
  { id: 'faculty-3', department_id: 'dept-chem', name: 'Dr. Cy John', designation: 'Professor' }
];

function invokeGuard(guard, role) {
  const result = {};
  let continued = false;
  const response = {
    status(code) {
      result.status = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };
  guard({ user: role ? { role } : null }, response, () => {
    continued = true;
  });
  return { ...result, continued };
}

test('institution record management endpoints allow RIC members and reject other roles', () => {
  const protectedRoutes = [
    ['/departments', 'post'],
    ['/departments/:departmentId', 'put'],
    ['/faculty', 'post'],
    ['/faculty/:facultyId', 'put'],
    ['/summary', 'get']
  ];

  protectedRoutes.forEach(([path, method]) => {
    const layer = institutionRoutes.stack.find((item) =>
      item.route && item.route.path === path && item.route.methods[method]
    );
    assert.ok(layer, `${method.toUpperCase()} ${path} is registered`);
    const guard = layer.route.stack[1].handle;
    for (const role of ['ric_head', 'ric_admin', 'ric_member']) {
      assert.equal(invokeGuard(guard, role).continued, true, `${role} should be authorized`);
    }
    for (const role of ['student', 'faculty_principal', 'institutional_user']) {
      assert.equal(invokeGuard(guard, role).status, 403, `${role} should be denied`);
    }
    assert.equal(invokeGuard(guard, null).status, 401);
  });
});

test('department and faculty inputs are normalized and reject invalid values or references', () => {
  assert.deepEqual(validateDepartmentInput({ name: '  Biology  ', code: ' bio ' }).data, {
    name: 'Biology',
    code: 'BIO'
  });
  assert.deepEqual(validateDepartmentInput({ name: 'Department without a code', code: '' }).data, {
    name: 'Department without a code',
    code: ''
  });
  assert.deepEqual(validateDepartmentInput({ name: 'Keep current code' }).data, {
    name: 'Keep current code'
  });
  assert.match(validateDepartmentInput({ name: '', code: 'BIO' }).error, /required/);
  assert.match(validateDepartmentInput({ name: 'Biology', code: 'B!' }).error, /code/);

  assert.deepEqual(validateFacultyInput({
    name: ' Dr. Ada Rao ',
    designation: ' Professor ',
    email: 'ADA@COLLEGE.EDU',
    department_id: 'dept-bio'
  }, departments).data, {
    name: 'Dr. Ada Rao',
    designation: 'Professor',
    email: 'ada@college.edu',
    department_id: 'dept-bio'
  });
  assert.match(validateFacultyInput({
    name: 'Dr. Nobody',
    designation: 'Professor',
    department_id: 'unknown'
  }, departments).error, /existing department/);
  assert.match(validateFacultyInput({
    name: 'Dr. Nobody',
    designation: 'Professor',
    email: 'not-an-email',
    department_id: 'dept-bio'
  }, departments).error, /valid institutional email/);
});

test('course department defaults are idempotent and preserve administrator edits', () => {
  const existing = [{
    id: 'existing-computer-applications',
    name: 'Computer Applications & AI',
    code: 'CAI',
    course_catalog_key: ''
  }];
  const firstPass = reconcileCourseCatalogDepartments(existing);
  const secondPass = reconcileCourseCatalogDepartments(firstPass);
  const computerApplications = secondPass.find((item) =>
    item.id === 'existing-computer-applications'
  );

  assert.equal(firstPass.length, 9);
  assert.deepEqual(secondPass, firstPass);
  assert.equal(computerApplications.name, 'Computer Applications & AI');
  assert.equal(computerApplications.code, 'CAI');
  assert.equal(computerApplications.course_catalog_key, 'computer-applications');
  const renamedByAdmin = reconcileCourseCatalogDepartments([{
    id: 'renamed-department',
    name: 'School of Computing',
    code: 'SC',
    course_catalog_key: 'computer-applications'
  }]);
  assert.equal(renamedByAdmin.length, 9);
  assert.equal(renamedByAdmin.find((item) => item.id === 'renamed-department').name, 'School of Computing');
  assert.equal(renamedByAdmin.find((item) => item.id === 'renamed-department').code, 'SC');
  assert.deepEqual(
    COURSE_CATALOG.find((item) => item.key === 'computer-applications').programmes.map((item) => item.name),
    ['BCA (Honours)', 'MCA']
  );
  assert.deepEqual(UNASSIGNED_PROGRAMMES, ['B.Sc. Statistics', 'M.Sc. Actuarial Science']);
  assert.equal(secondPass.some((item) => item.name.includes('Statistics')), false);
  assert.equal(secondPass.some((item) => item.name.includes('Actuarial')), false);
});

test('course catalog uses the supplied mappings and keeps statistics programmes unassigned', () => {
  assert.deepEqual(COURSE_CATALOG.map(({ department, programmes }) => [
    department,
    programmes.map(({ name, specializations }) => [name, specializations])
  ]), [
    ['Department of Computer Applications', [
      ['BCA (Honours)', ['Artificial Intelligence', 'Machine Learning', 'Data Science']],
      ['MCA', []]
    ]],
    ['Department of Business Administration', [
      ['BBA (Honours)', ['Business Analytics', 'Human Resource Management']]
    ]],
    ['Department of Animation and Visual Effects', [
      ['BA (Honours) Animation and Visual Effects', ['VFX & Animation Production']]
    ]],
    ['Department of Visual Communication', [
      ['BA (Honours) Visual Communication', ['Advertisement', 'New Media Journalism']]
    ]],
    ['Department of Social Work', [
      ['BSW (Honours)', ['Medical Social Work', 'Psychiatric Social Work', 'Multi-Cultural Social Work']],
      ['MSW', []]
    ]],
    ['Department of Cyber Forensics', [
      ['B.Sc. (Honours) Cyber Forensics', ['Network Security', 'Operating System Architecture']]
    ]],
    ['Department of Clinical Nutrition and Dietetics', [
      ['B.Sc. Clinical Nutrition and Dietetics', []]
    ]],
    ['Department of Computer Science', [
      ['B.Sc. Computer Science', []],
      ['Integrated M.Sc. Computer Science', ['Artificial Intelligence', 'Machine Learning']]
    ]],
    ['Department of Commerce', [
      ['B.Com (Honours)', ['Finance & Taxation', 'Accounting', 'Logistics Management', 'Financial Markets']]
    ]]
  ]);
  assert.deepEqual(UNASSIGNED_PROGRAMMES, ['B.Sc. Statistics', 'M.Sc. Actuarial Science']);
});

test('project assignments require a lead and unique permitted faculty from the selected department', () => {
  const valid = validateProjectAssignment({
    departmentId: 'dept-bio',
    leadFacultyId: 'faculty-1',
    teamMemberIds: ['faculty-2'],
    departments,
    faculty
  });
  assert.deepEqual(valid.data, {
    department_id: 'dept-bio',
    department: 'Biology',
    lead_faculty_id: 'faculty-1',
    lead_investigator: 'Dr. Ada Rao',
    team_member_ids: ['faculty-2'],
    team_members: ['Dr. Ben Das']
  });

  assert.match(validateProjectAssignment({
    departmentId: 'missing',
    leadFacultyId: 'faculty-1',
    departments,
    faculty
  }).error, /not available/);
  assert.match(validateProjectAssignment({
    departmentId: 'dept-bio',
    leadFacultyId: 'faculty-3',
    departments,
    faculty
  }).error, /permitted faculty/);
  assert.match(validateProjectAssignment({
    departmentId: 'dept-bio',
    leadFacultyId: 'faculty-1',
    teamMemberIds: ['faculty-2', 'faculty-2'],
    departments,
    faculty
  }).error, /only be selected once/);
  assert.match(validateProjectAssignment({
    departmentId: 'dept-bio',
    leadFacultyId: 'faculty-1',
    teamMemberIds: ['Arbitrary Person'],
    departments,
    faculty
  }).error, /permitted faculty/);
});

test('department summaries count linked projects and keep legacy records unlinked', () => {
  const summary = summarizeDepartmentProjects(departments, [
    { department_id: 'dept-bio', status: 'pending' },
    { department_id: 'dept-bio', status: 'approved' },
    { department: 'Chemistry', status: 'ongoing' },
    { department_id: 'retired-department', status: 'mystery' }
  ]);
  assert.equal(summary.departments[0].total, 2);
  assert.deepEqual(summary.departments[0].statusCounts, {
    pending: 1,
    approved: 1,
    changes_requested: 0,
    ongoing: 0,
    completed: 0,
    rejected: 0,
    unknown: 0
  });
  assert.equal(summary.departments[1].total, 0);
  assert.equal(summary.unlinked.total, 2);
  assert.equal(summary.unlinked.statusCounts.ongoing, 1);
  assert.equal(summary.unlinked.statusCounts.unknown, 1);
});
