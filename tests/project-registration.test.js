import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectRecord, listAllProjects } from '../src/db/projectRepository.js';
import { validateProjectAssignment } from '../src/services/institution.js';

test('Module 4: Project Registration validates and stores all student proposal fields', async () => {
  const departments = [
    { id: 'dept-ca', name: 'Department of Computer Applications', code: 'CA' },
    { id: 'dept-cf', name: 'Department of Cyber Forensics', code: 'CF' }
  ];
  const faculty = [
    {
      id: 'fac-ca-1',
      name: 'Dr. Mathew Joseph',
      designation: 'Associate Professor & HOD',
      department_id: 'dept-ca',
      is_active: true
    },
    {
      id: 'fac-cf-1',
      name: 'Dr. George Kutty Varghese',
      designation: 'Professor & HOD',
      department_id: 'dept-cf',
      is_active: true
    }
  ];

  // 1. Enter project title, department, guide teacher
  const assignment = validateProjectAssignment({
    departmentId: 'dept-cf',
    leadFacultyId: 'fac-cf-1',
    teamMemberIds: [],
    departments,
    faculty
  });

  assert.equal(assignment.error, undefined);
  assert.equal(assignment.data.department, 'Department of Cyber Forensics');
  assert.equal(assignment.data.lead_investigator, 'Dr. George Kutty Varghese');

  // 2. Record project category, abstract, problem statement, objectives
  // 3. Add methodology, keywords, innovation, expected results
  const testCode = `BVM/RIC/2026/CF/TEST_${Date.now()}`;
  const proposalPayload = {
    project_code: testCode,
    title: 'Autonomous Kernel eBPF Telemetry for Campus Zero-Day Threat Mitigation',
    department_id: assignment.data.department_id,
    department: assignment.data.department,
    programme: 'B.Sc. (Honours) Cyber Forensics — Network Security',
    lead_faculty_id: assignment.data.lead_faculty_id,
    lead_investigator: assignment.data.lead_investigator,
    guide_teacher: 'Dr. George Kutty Varghese (Professor & HOD, Cyber Forensics)',
    student_team_members: 'Alphy Maria, Nidhin Paul',
    category: 'Research',
    status: 'pending',
    abstract: 'Kernel-level detection daemon monitoring evasive fileless memory malware across campus subnet nodes.',
    problem_statement: 'Modern fileless zero-day exploits circumvent conventional heuristic antivirus by executing directly in memory.',
    objectives: '1. Develop eBPF socket filters.\n2. Train an ONNX anomaly classifier.\n3. Implement real-time collegiate SOC alerts.',
    methodology: 'Capture raw kernel telemetry vectors, compute bigram token frequencies, and perform ONNX inferencing.',
    keywords: 'Cyber Forensics, eBPF, Malware Triage, Zero-Day, Kerala',
    innovation: 'First lightweight eBPF socket monitoring framework adapted for educational intranet infrastructure.',
    expected_results: 'A production daemon achieving >98% accuracy with under 3% CPU utilization.',
    expected_outcomes: 'A production daemon achieving >98% accuracy with under 3% CPU utilization.',
    duration_months: 12,
    submitted_by: 'student_123',
    submitted_by_name: 'Alphy Maria'
  };

  const created = await createProjectRecord(proposalPayload);

  assert.ok(created);
  assert.equal(created.project_code, testCode);
  assert.equal(created.title, proposalPayload.title);
  assert.equal(created.department, 'Department of Cyber Forensics');
  assert.equal(created.guide_teacher, 'Dr. George Kutty Varghese (Professor & HOD, Cyber Forensics)');
  assert.equal(created.problem_statement, proposalPayload.problem_statement);
  assert.equal(created.objectives, proposalPayload.objectives);
  assert.equal(created.methodology, proposalPayload.methodology);
  assert.equal(created.keywords, proposalPayload.keywords);
  assert.equal(created.innovation, proposalPayload.innovation);
  assert.equal(created.expected_results, proposalPayload.expected_results);
  assert.equal(created.duration_months, 12);
  assert.equal(created.status, 'pending');

  // Clean up test record from local storage to keep state pristine
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const file = path.resolve('data/projects.json');
    if (fs.existsSync(file)) {
      const records = JSON.parse(fs.readFileSync(file, 'utf-8')).filter((p) => p.project_code !== testCode);
      fs.writeFileSync(file, JSON.stringify(records, null, 2), 'utf-8');
    }
  } catch (e) {
    // ignore
  }
});
