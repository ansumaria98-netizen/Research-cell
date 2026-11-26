const PROJECT_STATUSES = Object.freeze([
  'pending',
  'approved',
  'changes_requested',
  'ongoing',
  'completed',
  'rejected',
  'unknown'
]);

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getRecordId(record) {
  return record && (record.id || record._id) ? String(record.id || record._id) : '';
}

export function validateDepartmentInput(body = {}) {
  const name = cleanText(body.name);
  const code = cleanText(body.code).toUpperCase();
  const hasCode = Object.prototype.hasOwnProperty.call(body, 'code');
  if (!name) return { error: 'Department name is required.' };
  if (name.length > 120) return { error: 'Department name must be 120 characters or fewer.' };
  if (hasCode && typeof body.code !== 'string') {
    return { error: 'Department code must be text.' };
  }
  if (code && !/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(code)) {
    return { error: 'Department code must be 1–20 letters, numbers, hyphens, or underscores.' };
  }
  return { data: { name, ...(hasCode ? { code } : {}) } };
}

export function validateFacultyInput(body = {}, departments = []) {
  const name = cleanText(body.name);
  const email = cleanText(body.email).toLowerCase();
  const designation = cleanText(body.designation);
  const departmentId = cleanText(body.department_id);

  if (!name || !designation || !departmentId) {
    return { error: 'Faculty name, designation, and department are required.' };
  }
  if (name.length > 120 || designation.length > 120) {
    return { error: 'Faculty name and designation must be 120 characters or fewer.' };
  }
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: 'Enter a valid institutional email or personal email address.' };
  }
  const department = departments.find((item) => getRecordId(item) === departmentId);
  if (!department) return { error: 'Choose an existing department.' };

  return {
    data: {
      name,
      email,
      designation,
      department_id: departmentId
    }
  };
}

export function validateProjectAssignment({
  departmentId,
  leadFacultyId,
  teamMemberIds = [],
  departments = [],
  faculty = []
}) {
  if (typeof departmentId !== 'string' || !departmentId.trim()) {
    return { error: 'Choose a department from the institution directory.' };
  }
  const department = departments.find((item) => getRecordId(item) === departmentId);
  if (!department) return { error: 'The selected department is not available.' };
  if (typeof leadFacultyId !== 'string' || !leadFacultyId.trim()) {
    return { error: 'Choose a permitted faculty lead investigator.' };
  }
  if (!Array.isArray(teamMemberIds) || teamMemberIds.length > 30) {
    return { error: 'Choose no more than 30 permitted faculty team members.' };
  }
  if (teamMemberIds.some((id) => typeof id !== 'string' || !id.trim())) {
    return { error: 'Select team members from the permitted faculty list.' };
  }
  if (new Set(teamMemberIds).size !== teamMemberIds.length) {
    return { error: 'A faculty team member may only be selected once.' };
  }
  if (teamMemberIds.includes(leadFacultyId)) {
    return { error: 'The lead investigator should not also be listed as a team member.' };
  }

  const departmentFaculty = faculty.filter((item) =>
    item.department_id === departmentId && item.is_active !== false
  );
  const lead = departmentFaculty.find((item) => getRecordId(item) === leadFacultyId);
  if (!lead) return { error: 'The lead investigator must be permitted faculty in the selected department.' };
  const members = teamMemberIds.map((id) =>
    departmentFaculty.find((item) => getRecordId(item) === id)
  );
  if (members.some((item) => !item)) {
    return { error: 'Every team member must be permitted faculty in the selected department.' };
  }

  return {
    data: {
      department_id: departmentId,
      department: department.name,
      lead_faculty_id: getRecordId(lead),
      guide_id: getRecordId(lead),
      guide_name: lead.name,
      guide_email: lead.email || '',
      guide_teacher: lead.name,
      lead_investigator: lead.name,
      team_member_ids: members.map(getRecordId),
      team_members: members.map((item) => item.name)
    }
  };
}

export function summarizeDepartmentProjects(departments = [], projects = []) {
  const summaries = departments.map((department) => ({
    id: getRecordId(department),
    name: department.name,
    code: department.code,
    total: 0,
    statusCounts: Object.fromEntries(PROJECT_STATUSES.map((status) => [status, 0]))
  }));
  const byId = new Map(summaries.map((summary) => [summary.id, summary]));
  const unlinked = {
    id: null,
    name: 'Legacy / unlinked department',
    code: '',
    total: 0,
    statusCounts: Object.fromEntries(PROJECT_STATUSES.map((status) => [status, 0]))
  };

  projects.forEach((project) => {
    const summary = byId.get(project.department_id) || unlinked;
    const status = PROJECT_STATUSES.includes(project.status) ? project.status : 'unknown';
    summary.total++;
    summary.statusCounts[status]++;
  });

  return {
    departments: summaries,
    unlinked: unlinked.total ? unlinked : null
  };
}
