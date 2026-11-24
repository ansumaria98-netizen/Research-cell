const { useState, useEffect, useRef } = React;

function getValidTimestamp(dateValue) {
  if (dateValue === null || dateValue === undefined || dateValue === '') return null;
  const timestamp = new Date(dateValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatProjectDate(dateString, options = {}) {
  const timestamp = getValidTimestamp(dateString);
  if (timestamp === null) return 'Date unavailable';
  return new Date(timestamp).toLocaleDateString('en-IN', options);
}

const OFFICIAL_INSTITUTIONAL_DEPARTMENTS = [
  'Department of Computer Applications',
  'Department of Computer Science',
  'Department of Cyber Forensics',
  'Department of Business Administration',
  'Department of Commerce',
  'Department of Social Work',
  'Department of Animation and Visual Effects',
  'Department of Visual Communication',
  'Department of Clinical Nutrition and Dietetics'
];

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auth Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: request code, 2: reset pass
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Registration Form State
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Department of Computer Applications',
    designation: '1st Year UG',
    role: 'student' // 'student' | 'faculty_principal'
  });
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Dashboard State (Strictly No Funds / Real-Time Data)
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardProjects, setDashboardProjects] = useState(null);
  const [dashboardProjectsLoading, setDashboardProjectsLoading] = useState(false);
  const [dashboardProjectsError, setDashboardProjectsError] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    department: '',
    department_id: '',
    programme: '',
    guide_teacher: '',
    lead_investigator: '',
    lead_faculty_id: '',
    student_team_members: '',
    team_members: '',
    team_member_ids: [],
    category: 'Research',
    abstract: '',
    problem_statement: '',
    objectives: '',
    methodology: '',
    keywords: '',
    innovation: '',
    expected_results: '',
    expected_outcomes: '',
    duration_months: '12'
  });
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectError, setProjectError] = useState('');
  const [projectSuccess, setProjectSuccess] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [similarityMatches, setSimilarityMatches] = useState([]);
  const [similarityLoading, setSimilarityLoading] = useState(false);
  const [similarityChecked, setSimilarityChecked] = useState(false);
  const [similarityNotice, setSimilarityNotice] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSimilarityMatches, setReviewSimilarityMatches] = useState([]);
  const [reviewSimilarityLoading, setReviewSimilarityLoading] = useState(false);
  const [reviewSimilarityError, setReviewSimilarityError] = useState('');

  // Module 5: AI Similarity Scanner State
  const [scannerForm, setScannerForm] = useState({
    title: '',
    department: '',
    department_id: '',
    scope: 'department',
    abstract: '',
    problem_statement: '',
    objectives: '',
    methodology: '',
    keywords: '',
    expected_results: ''
  });
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerResults, setScannerResults] = useState(null);
  const [scannerError, setScannerError] = useState('');
  const [selectedPresetCode, setSelectedPresetCode] = useState('');

  // Module 6: Review & Evaluation State
  const [evalModalProject, setEvalModalProject] = useState(null);
  const [assignModalProject, setAssignModalProject] = useState(null);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState([]);
  const [availableReviewers, setAvailableReviewers] = useState([]);
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [evaluationRubric, setEvaluationRubric] = useState([
    { id: 'novelty', label: 'Originality & Novelty', max_score: 20, description: 'Novelty of problem statement, intellectual originality, and differentiation from existing work.' },
    { id: 'methodology', label: 'Academic & Technical Methodology', max_score: 20, description: 'Soundness of research design, algorithmic or experimental rigor, and data validation plan.' },
    { id: 'feasibility', label: 'Feasibility & Implementation Plan', max_score: 20, description: 'Practicality of execution timeline, resource allocation, and mentorship alignment.' },
    { id: 'impact', label: 'Societal & Institutional Impact', max_score: 20, description: 'Practical utility to society / Kerala region, publication, intellectual property, or commercial potential.' },
    { id: 'clarity', label: 'Clarity of Objectives & Deliverables', max_score: 20, description: 'Precision of research objectives, quality of expected deliverables, and documentation standard.' }
  ]);
  const [evaluationForm, setEvaluationForm] = useState({
    criteria_scores: {
      novelty: 16,
      methodology: 16,
      feasibility: 16,
      impact: 16,
      clarity: 16
    },
    recommendation: 'Approve',
    comments: ''
  });
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [evalSuccess, setEvalSuccess] = useState('');
  const [module6Filter, setModule6Filter] = useState('all');
  const [module6Search, setModule6Search] = useState('');
  const [module6DepartmentFilter, setModule6DepartmentFilter] = useState('all');

  // Department and permitted-faculty directory state
  const [departments, setDepartments] = useState([]);
  const [unassignedProgrammes, setUnassignedProgrammes] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [departmentSummary, setDepartmentSummary] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [institutionError, setInstitutionError] = useState('');
  const [institutionNotice, setInstitutionNotice] = useState('');
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '' });
  const [editingDepartmentId, setEditingDepartmentId] = useState('');
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    designation: '',
    department_id: ''
  });
  const [editingFacultyId, setEditingFacultyId] = useState('');
  const [institutionSaving, setInstitutionSaving] = useState(false);

  // Master Courses and Guide Allocation State
  const [courses, setCourses] = useState([]);
  const [guides, setGuides] = useState([]);
  const [courseForm, setCourseForm] = useState({ name: '', code: '', level: 'UG', department_id: '' });
  const [editingCourseId, setEditingCourseId] = useState('');
  const [guideCapacityForm, setGuideCapacityForm] = useState({ faculty_id: '', capacity: 15 });

  // Module 8: Guide Review State
  const [guideProposals, setGuideProposals] = useState([]);
  const [guideProposalsLoading, setGuideProposalsLoading] = useState(false);
  const [selectedGuideProject, setSelectedGuideProject] = useState(null);
  const [guideReviewForm, setGuideReviewForm] = useState({ recommendation: 'recommended', comments: '' });
  const [guideReviewSubmitting, setGuideReviewSubmitting] = useState(false);
  const [guideReviewError, setGuideReviewError] = useState('');

  // Module 9: Official RIC Council Decisions & Approval Letter State
  const [decisionStates, setDecisionStates] = useState([]);
  const [selectedDecisionProject, setSelectedDecisionProject] = useState(null);
  const [officialDecisionForm, setOfficialDecisionForm] = useState({
    decision: 'approved',
    comments: '',
    reasons: '',
    conditions: '',
    signatory_name: '',
    signatory_title: ''
  });
  const [officialDecisionSubmitting, setOfficialDecisionSubmitting] = useState(false);
  const [officialDecisionError, setOfficialDecisionError] = useState('');
  const [viewApprovalLetterProject, setViewApprovalLetterProject] = useState(null);
  const [academicYearFilter, setAcademicYearFilter] = useState('all');

  // Module 9: RIC Panel Interview & Oral Defense State
  const [panelInterviewProject, setPanelInterviewProject] = useState(null);
  const [panelForm, setPanelForm] = useState({
    interview_date: new Date().toISOString().slice(0, 16),
    interview_venue: 'Research & Innovation Cell (RIC) Room',
    interview_mode: 'In-Person Oral Defense & Viva Voce',
    panel_members: '',
    viva_scores: {
      presentation: 18,
      methodology: 18,
      defense: 18,
      feasibility: 18,
      novelty: 18
    },
    total_score: 90,
    panel_observations: '',
    decision: 'approved',
    conditions: '',
    signatory_name: '',
    signatory_title: 'Head, Research & Innovation Cell / Principal'
  });
  const [panelSubmitting, setPanelSubmitting] = useState(false);
  const [panelError, setPanelError] = useState('');

  // User Governance State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionMessage, setActionMessage] = useState(null);

  // Admin Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    designation: 'Student',
    department: 'Department of Computer Applications'
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const dashboardRequestId = useRef(0);
  const reviewSimilarityRequestId = useRef(0);

  // Check saved session on mount
  useEffect(() => {
    async function init() {
      // Check for Google OAuth redirect callback tokens or errors
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const authErrorParam = urlParams.get('auth_error');

      if (urlToken) {
        localStorage.setItem('iripgms_token', urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      if (authErrorParam) {
        setAuthError(authErrorParam);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const savedToken = localStorage.getItem('iripgms_token');
      if (savedToken) {
        try {
          const user = await window.api.getMe();
          setCurrentUser(user);
        } catch (err) {
          localStorage.removeItem('iripgms_token');
          localStorage.removeItem('iripgms_user');
        }
      }

      try {
        const status = await window.api.getSystemStatus();
        setSystemStatus(status);
      } catch (err) {
        console.warn('System status check:', err.message);
      }

      setLoading(false);
    }
    init();
  }, []);

  // Fetch data upon login and auto-poll every 15s for live real-time metrics
  useEffect(() => {
    if (currentUser) {
      fetchDashboard();
      fetchInstitutionData();
      if (isRICHead(currentUser)) {
        fetchUsers();
      }
      if (isRICMember(currentUser)) {
        fetchCommitteeReviewers();
        window.api.getEvaluationCriteria().then((res) => {
          if (res && res.criteria) setEvaluationRubric(res.criteria);
        }).catch((e) => console.warn('Rubric load:', e.message));
      }
      const liveInterval = setInterval(() => {
        fetchDashboard(true);
      }, 15000);
      return () => clearInterval(liveInterval);
    }
  }, [currentUser]);

  // Ensure student department and default guide teacher are automatically configured
  useEffect(() => {
    if (currentUser && currentUser.role === 'student' && departments.length > 0) {
      const studentDept = departments.find((d) =>
        (d.name && currentUser.department && d.name.toLowerCase() === currentUser.department.toLowerCase()) ||
        (d.name && currentUser.department && (d.name.toLowerCase().includes(currentUser.department.toLowerCase()) || currentUser.department.toLowerCase().includes(d.name.toLowerCase())))
      );
      if (studentDept && (!projectForm.department_id || projectForm.department_id !== studentDept.id)) {
        const deptFaculty = faculty.filter((f) => f.department_id === studentDept.id && f.is_active !== false);
        const defaultLead = deptFaculty[0];
        setProjectForm((prev) => ({
          ...prev,
          department: studentDept.name,
          department_id: studentDept.id,
          ...(!prev.lead_faculty_id && defaultLead ? {
            lead_faculty_id: defaultLead.id,
            lead_investigator: defaultLead.name,
            guide_teacher: `${defaultLead.name} (${defaultLead.designation})`
          } : {})
        }));
      }
    }
  }, [currentUser, departments, faculty]);

  // Role checker helpers
  const isRICHead = (user) => {
    if (!user) return false;
    return ['ric_head', 'ric_admin', 'ric_member', 'admin'].includes(user.role);
  };

  const isInstitutionManager = (user) => {
    return Boolean(user && ['ric_head', 'ric_admin', 'ric_member', 'admin'].includes(user.role));
  };

  const isRICMember = (user) => {
    return Boolean(user && ['ric_head', 'ric_admin', 'ric_member', 'admin'].includes(user.role));
  };

  const canSubmitProject = (user) => {
    return Boolean(user && user.role === 'student');
  };

  const isFaculty = (user) => {
    return Boolean(user && (
      user.role === 'faculty_principal' ||
      user.role === 'guide' ||
      user.role === 'institutional_user' ||
      (user.designation && (
        user.designation.toLowerCase().includes('professor') ||
        user.designation.toLowerCase().includes('faculty') ||
        user.designation.toLowerCase().includes('hod') ||
        user.designation.toLowerCase().includes('guide') ||
        user.designation.toLowerCase().includes('mentor')
      ))
    ));
  };

  const openProjectRegistration = (project = null) => {
    setEditingProjectId(project ? project._id : null);

    // A student belongs strictly to only 1 department (their enrolled department)
    let initialDepartmentId = '';
    let initialDeptName = '';

    if (currentUser && currentUser.role === 'student') {
      const studentEnrolledDept = departments.find((d) =>
        (d.name && currentUser.department && d.name.toLowerCase() === currentUser.department.toLowerCase()) ||
        (d.name && currentUser.department && (d.name.toLowerCase().includes(currentUser.department.toLowerCase()) || currentUser.department.toLowerCase().includes(d.name.toLowerCase())))
      );
      if (studentEnrolledDept) {
        initialDepartmentId = studentEnrolledDept.id;
        initialDeptName = studentEnrolledDept.name;
      } else if (departments.length > 0) {
        initialDepartmentId = departments[0].id;
        initialDeptName = departments[0].name;
      }
    } else {
      initialDepartmentId = project
        ? project.department_id || ''
        : selectedDepartmentId || (departments[0] && departments[0].id) || '';
      const found = departments.find((d) => d.id === initialDepartmentId);
      initialDeptName = found ? found.name : (currentUser.department || '');
    }

    const initialDept = departments.find((d) => d.id === initialDepartmentId);
    let initialProg = project ? (project.programme || '') : '';
    if (!initialProg && initialDept && Array.isArray(initialDept.programmes) && initialDept.programmes.length > 0) {
      const p = initialDept.programmes[0];
      initialProg = (p.specializations && p.specializations.length > 0) ? `${p.name} — ${p.specializations[0]}` : p.name;
    }

    const matchingFaculty = faculty.filter((f) => f.department_id === initialDepartmentId && f.is_active !== false);
    const defaultLead = matchingFaculty.length > 0 ? matchingFaculty[0] : null;

    const leadId = project ? (project.lead_faculty_id || '') : (defaultLead ? defaultLead.id : '');
    const leadName = project ? (project.lead_investigator || project.guide_teacher || '') : (defaultLead ? defaultLead.name : '');
    const guideName = project ? (project.guide_teacher || project.lead_investigator || '') : (defaultLead ? `${defaultLead.name} (${defaultLead.designation})` : '');

    setProjectForm({
      title: project ? project.title : '',
      department: project ? project.department : initialDeptName,
      department_id: initialDepartmentId,
      programme: initialProg,
      course: project ? (project.course || project.programme || '') : (currentUser && currentUser.course ? currentUser.course : initialProg),
      course_id: project ? (project.course_id || '') : (currentUser && currentUser.course_id ? currentUser.course_id : ''),
      academic_year: project ? (project.academic_year || '2026-27') : (currentUser && currentUser.academic_year ? currentUser.academic_year : '2026-27'),
      register_number: project ? (project.register_number || '') : (currentUser && currentUser.register_number ? currentUser.register_number : ''),
      guide_id: project ? (project.guide_id || project.lead_faculty_id || '') : (currentUser && currentUser.allocated_guide_id ? currentUser.allocated_guide_id : leadId),
      guide_name: project ? (project.guide_name || project.guide_teacher || '') : (currentUser && currentUser.allocated_guide_name ? currentUser.allocated_guide_name : leadName),
      guide_teacher: guideName,
      lead_investigator: leadName,
      lead_faculty_id: leadId,
      student_team_members: project ? (project.student_team_members || '') : '',
      team_members: project && project.team_members ? project.team_members.join('\n') : '',
      team_member_ids: project && Array.isArray(project.team_member_ids) ? project.team_member_ids : [],
      category: project ? project.category : 'Research',
      abstract: project ? project.abstract || '' : '',
      problem_statement: project ? project.problem_statement || '' : '',
      objectives: project ? project.objectives || '' : '',
      methodology: project ? project.methodology || '' : '',
      keywords: project ? project.keywords || '' : '',
      innovation: project ? project.innovation || '' : '',
      expected_results: project ? (project.expected_results || project.expected_outcomes || '') : '',
      expected_outcomes: project ? (project.expected_outcomes || project.expected_results || '') : '',
      duration_months: project ? String(project.duration_months || 12) : '12'
    });
    setProjectError('');
    setProjectSuccess('');
    setSimilarityMatches(project && project.similarity_matches ? project.similarity_matches : []);
    setSimilarityChecked(Boolean(project && project.similarity_matches && project.similarity_matches.length));
    setSimilarityNotice('');
    setReviewError('');
    setReviewSimilarityMatches([]);
    setReviewSimilarityError('');
    setReviewSimilarityLoading(false);
    reviewSimilarityRequestId.current++;
    setSelectedProject(null);
    setActiveTab('register-project');
  };

  const getProjectSubmissionPayload = () => ({
    ...projectForm,
    course: projectForm.course || projectForm.programme,
    academic_year: projectForm.academic_year || '2026-27',
    register_number: projectForm.register_number || (currentUser && currentUser.register_number) || '',
    guide_id: projectForm.guide_id || projectForm.lead_faculty_id,
    guide_name: projectForm.guide_name || projectForm.guide_teacher,
    guide_teacher: projectForm.guide_teacher || projectForm.lead_investigator,
    lead_investigator: projectForm.lead_investigator || projectForm.guide_teacher,
    expected_outcomes: projectForm.expected_results || projectForm.expected_outcomes,
    expected_results: projectForm.expected_results || projectForm.expected_outcomes,
    duration_months: Number(projectForm.duration_months || 12),
    team_member_ids: Array.isArray(projectForm.team_member_ids) ? projectForm.team_member_ids : []
  });

  const updateProjectField = (field, value) => {
    setProjectForm({ ...projectForm, [field]: value });
    setSimilarityMatches([]);
    setSimilarityChecked(false);
    setSimilarityNotice('');
  };

  const handleCheckProjectSimilarity = async () => {
    setProjectError('');
    setSimilarityLoading(true);
    try {
      const { matches, notice, saved } = await window.api.checkProjectSimilarity({
        ...getProjectSubmissionPayload(),
        project_id: editingProjectId || undefined
      });
      setSimilarityMatches(matches);
      setSimilarityChecked(true);
      setSimilarityNotice(
        saved
          ? `${notice || 'Similarity results saved for RIC reference.'} The proposal is not rejected automatically.`
          : (notice || 'These results support human review. A proposal is never rejected automatically.')
      );
    } catch (err) {
      setProjectError(err.message || 'Failed to check project similarity.');
    } finally {
      setSimilarityLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setProjectError('');
    setProjectSuccess('');
    setProjectSubmitting(true);
    const isEdit = Boolean(editingProjectId);

    try {
      const payload = getProjectSubmissionPayload();
      const res = isEdit
        ? await window.api.updateProject(editingProjectId, payload)
        : await window.api.createProject(payload);
      const project = res.project;
      const matches = res.similarityMatches || [];
      setProjectSuccess(
        `${isEdit ? 'Proposal updated' : 'Project proposal submitted'} successfully. Institutional Code: ${project.project_code}`
      );
      setSimilarityMatches(matches);
      setSimilarityChecked(true);
      setSimilarityNotice('');
      if (!isEdit) {
        openProjectRegistration(null);
      }
      await fetchDashboard(true);
    } catch (err) {
      setProjectError(err.message || 'Failed to save project proposal.');
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!project) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to withdraw/delete proposal "${project.title}" (${project.project_code})?\n\nThis will permanently remove the proposal from the system.`
    );
    if (!confirmDelete) return;

    try {
      setActionMessage({ type: 'success', text: `Withdrawing proposal ${project.project_code}…` });
      await window.api.deleteProject(project._id);
      setActionMessage({
        type: 'success',
        text: `Proposal ${project.project_code} has been successfully withdrawn and deleted.`
      });
      if (selectedProject && (selectedProject._id === project._id || selectedProject.project_code === project.project_code)) {
        closeProjectDossier();
      }
      if (editingProjectId === project._id) {
        setEditingProjectId(null);
        openProjectRegistration();
      }
      await fetchDashboard(true);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to withdraw proposal.'
      });
    }
  };

  const handleRunScanner = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setScannerError('');
    setScannerLoading(true);
    try {
      const selectedDept = departments.find((d) => d.id === scannerForm.department_id);
      const loadedProject = selectedPresetCode && dashboardProjectList
        ? dashboardProjectList.find((project) => project.project_code === selectedPresetCode || project._id === selectedPresetCode)
        : null;
      const payload = {
        title: scannerForm.title,
        department: scannerForm.department || (selectedDept ? selectedDept.name : ''),
        department_id: scannerForm.department_id,
        scope: scannerForm.scope,
        abstract: scannerForm.abstract,
        problem_statement: scannerForm.problem_statement,
        objectives: scannerForm.objectives,
        methodology: scannerForm.methodology,
        keywords: scannerForm.keywords,
        expected_results: scannerForm.expected_results,
        project_id: loadedProject ? loadedProject._id : undefined
      };
      const res = await window.api.checkProjectSimilarity(payload);
      setScannerResults(res);
    } catch (err) {
      setScannerError(err.message || 'Failed to execute AI similarity scan.');
    } finally {
      setScannerLoading(false);
    }
  };

  const handleLoadPresetProject = (projectCode) => {
    setSelectedPresetCode(projectCode);
    if (!projectCode || !dashboardProjectList) return;
    const found = dashboardProjectList.find((p) => p.project_code === projectCode || p._id === projectCode);
    if (!found) return;
    const matchingDept = departments.find((d) => d.name === found.department);
    setScannerForm({
      title: found.title || '',
      department: found.department || '',
      department_id: matchingDept ? matchingDept.id : (found.department_id || ''),
      scope: 'department',
      abstract: found.abstract || '',
      problem_statement: found.problem_statement || '',
      objectives: found.objectives || '',
      methodology: found.methodology || '',
      keywords: found.keywords || '',
      expected_results: found.expected_results || found.expected_outcomes || ''
    });
    setScannerResults(null);
    setScannerError('');
  };

  const handleReviewProject = async (decision, project = selectedProject, comment = reviewComment) => {
    if (!isRICMember(currentUser) || !project || project.status !== 'pending') return;

    const projectId = project._id || project.project_code;
    const isDossierReview = selectedProject
      && (selectedProject._id || selectedProject.project_code) === projectId;
    setReviewError('');
    setReviewSubmitting(true);
    try {
      const { project: reviewedProject } = await window.api.reviewProject(
        project._id,
        decision,
        comment.trim()
      );
      if (isDossierReview) closeProjectDossier();
      await fetchDashboard(true);
      setReviewComment('');
      setActionMessage({
        type: 'success',
        text: `${reviewedProject.project_code}: RIC decision recorded as ${reviewedProject.status.replace('_', ' ')}.`
      });
    } catch (err) {
      const message = err.message || 'Failed to save the RIC review decision.';
      if (isDossierReview) setReviewError(message);
      else setActionMessage({ type: 'error', text: message });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const checkReviewSimilarity = async (project) => {
    const requestId = ++reviewSimilarityRequestId.current;
    setReviewSimilarityMatches([]);
    setReviewSimilarityError('');
    setReviewSimilarityLoading(false);

    const department = typeof project.department === 'string' ? project.department.trim() : '';
    const title = typeof project.title === 'string' ? project.title.trim() : '';
    const abstract = typeof project.abstract === 'string' ? project.abstract.trim() : '';
    const description = typeof project.description === 'string' ? project.description.trim() : '';
    const objectives = typeof project.objectives === 'string' ? project.objectives.trim() : '';
    const methodology = typeof project.methodology === 'string' ? project.methodology.trim() : '';
    const keywords = typeof project.keywords === 'string' ? project.keywords.trim() : '';
    const expectedResults = typeof (project.expected_results || project.expected_outcomes) === 'string'
      ? (project.expected_results || project.expected_outcomes).trim()
      : '';
    if (!department || (!title && !abstract && !description && !objectives && !methodology && !keywords && !expectedResults)) return;

    setReviewSimilarityLoading(true);
    try {
      const { matches } = await window.api.checkProjectSimilarity({
        department,
        title,
        abstract,
        description,
        objectives,
        methodology,
        keywords,
        expected_results: expectedResults,
        project_id: project._id
      });
      if (requestId !== reviewSimilarityRequestId.current) return;
      setReviewSimilarityMatches(Array.isArray(matches) ? matches : []);
    } catch (err) {
      if (requestId !== reviewSimilarityRequestId.current) return;
      setReviewSimilarityError(err.message || 'Same-department similarity check failed.');
    } finally {
      if (requestId === reviewSimilarityRequestId.current) {
        setReviewSimilarityLoading(false);
      }
    }
  };

  const openProjectDossier = (project) => {
    setSelectedProject(project);
    setReviewComment('');
    setReviewError('');
    setReviewSimilarityMatches([]);
    setReviewSimilarityError('');
    if (isRICMember(currentUser) && project.status === 'pending') {
      checkReviewSimilarity(project);
    } else {
      reviewSimilarityRequestId.current++;
      setReviewSimilarityLoading(false);
    }
  };

  const closeProjectDossier = () => {
    reviewSimilarityRequestId.current++;
    setReviewSimilarityLoading(false);
    setSelectedProject(null);
  };

  // Module 6: Review & Evaluation Handlers
  const fetchCommitteeReviewers = async () => {
    setLoadingReviewers(true);
    try {
      const revs = await window.api.getCommitteeReviewers();
      setAvailableReviewers(revs);
    } catch (err) {
      console.warn('Failed to load committee reviewers:', err.message);
    } finally {
      setLoadingReviewers(false);
    }
  };

  const openAssignModal = (project) => {
    setAssignModalProject(project);
    setAssignError('');
    setAssignSuccess('');
    const currentAssigned = Array.isArray(project.assigned_reviewers)
      ? project.assigned_reviewers.map((r) => r.user_id)
      : [];
    setSelectedReviewerIds(currentAssigned);
    if (availableReviewers.length === 0) {
      fetchCommitteeReviewers();
    }
  };

  const handleAssignReviewersSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!assignModalProject) return;
    if (selectedReviewerIds.length === 0) {
      setAssignError('Please select at least one RIC reviewer to assign.');
      return;
    }
    setAssignSubmitting(true);
    setAssignError('');
    setAssignSuccess('');
    try {
      const res = await window.api.assignReviewers(assignModalProject._id || assignModalProject.project_code, selectedReviewerIds);
      setAssignSuccess(res.message || 'Reviewers successfully assigned.');
      await fetchDashboard(true);
      if (selectedProject && (selectedProject._id === assignModalProject._id || selectedProject.project_code === assignModalProject.project_code)) {
        setSelectedProject((prev) => ({
          ...prev,
          assigned_reviewers: res.assigned_reviewers || res.project?.assigned_reviewers || []
        }));
      }
      setTimeout(() => {
        setAssignModalProject(null);
        setAssignSuccess('');
      }, 1000);
    } catch (err) {
      setAssignError(err.message || 'Failed to assign reviewers');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const openEvaluationModal = (project) => {
    setEvalModalProject(project);
    setEvalError('');
    setEvalSuccess('');

    const existing = Array.isArray(project.evaluations)
      ? project.evaluations.find((ev) => ev.reviewer_id === (currentUser?.id || currentUser?._id))
      : null;

    if (existing) {
      setEvaluationForm({
        criteria_scores: {
          novelty: existing.criteria_scores?.novelty ?? 16,
          methodology: existing.criteria_scores?.methodology ?? 16,
          feasibility: existing.criteria_scores?.feasibility ?? 16,
          impact: existing.criteria_scores?.impact ?? 16,
          clarity: existing.criteria_scores?.clarity ?? 16
        },
        recommendation: existing.recommendation || 'Approve',
        comments: existing.comments || ''
      });
    } else {
      setEvaluationForm({
        criteria_scores: {
          novelty: 16,
          methodology: 16,
          feasibility: 16,
          impact: 16,
          clarity: 16
        },
        recommendation: 'Approve',
        comments: ''
      });
    }
  };

  const handleSubmitEvaluation = async (e) => {
    if (e) e.preventDefault();
    if (!evalModalProject) return;
    if (!evaluationForm.comments.trim()) {
      setEvalError('Evaluation comments and recommendations are required.');
      return;
    }
    setEvalSubmitting(true);
    setEvalError('');
    setEvalSuccess('');
    try {
      const res = await window.api.submitEvaluation(evalModalProject._id || evalModalProject.project_code, evaluationForm);
      setEvalSuccess(res.message || 'Evaluation submitted and recorded successfully.');
      await fetchDashboard(true);
      if (selectedProject && (selectedProject._id === evalModalProject._id || selectedProject.project_code === evalModalProject.project_code)) {
        const updated = res.project || {
          ...selectedProject,
          evaluations: [...(selectedProject.evaluations || []).filter(ev => ev.reviewer_id !== (currentUser?.id || currentUser?._id)), res.evaluation],
          evaluation_summary: res.summary || res.project?.evaluation_summary
        };
        setSelectedProject(updated);
      }
      setTimeout(() => {
        setEvalModalProject(null);
        setEvalSuccess('');
      }, 1000);
    } catch (err) {
      setEvalError(err.message || 'Failed to submit evaluation');
    } finally {
      setEvalSubmitting(false);
    }
  };

  const fetchDashboard = async (silent = false) => {
    const requestId = ++dashboardRequestId.current;
    if (!silent) {
      setDashboardLoading(true);
      setDashboardProjectsLoading(true);
    }
    try {
      const data = await window.api.getDashboardStats();
      if (requestId !== dashboardRequestId.current) return;
      setDashboardData(data);
      setDashboardError('');
      try {
        const projects = await window.api.getDashboardProjects();
        if (requestId !== dashboardRequestId.current) return;
        if (!Array.isArray(projects)) {
          throw new Error('The project list response is unavailable.');
        }
        setDashboardProjects(projects);
        setDashboardProjectsError('');
      } catch (err) {
        if (requestId !== dashboardRequestId.current) return;
        console.error('Failed to load dashboard projects:', err);
        setDashboardProjectsError(err.message || 'Unable to load the project list.');
      }
    } catch (err) {
      if (requestId !== dashboardRequestId.current) return;
      console.error('Failed to load dashboard:', err);
      if (!silent) setDashboardError(err.message || 'Unable to load project dashboard data.');
    } finally {
      if (requestId === dashboardRequestId.current && !silent) {
        setDashboardLoading(false);
        setDashboardProjectsLoading(false);
      }
    }
  };

  const dashboardProjectList = Array.isArray(dashboardProjects) ? dashboardProjects : null;
  const rawDepartmentGroups = dashboardProjectList
    ? window.dashboardUtils.groupProjectsByDepartment(dashboardProjectList)
    : null;
  // A student strictly belongs to only 1 department: show only their own enrolled department
  const dashboardDepartmentGroups = (rawDepartmentGroups && currentUser && currentUser.role === 'student')
    ? rawDepartmentGroups.filter((group) => {
        const userDept = (currentUser.department || '').trim().toLowerCase();
        const grpDept = (group.department || '').trim().toLowerCase();
        return userDept && (grpDept === userDept || grpDept.includes(userDept) || userDept.includes(grpDept));
      })
    : rawDepartmentGroups;

  // Student and researcher's own proposals for direct CRUD management
  const myProposals = dashboardProjectList && currentUser
    ? dashboardProjectList.filter((p) => {
        if (p.is_submitted_by_user) return true;
        if (p.submitted_by && p.submitted_by === currentUser.id) return true;
        if (currentUser.role === 'student') {
          const userDept = (currentUser.department || '').trim().toLowerCase();
          const projDept = (p.department || '').trim().toLowerCase();
          const sameDept = userDept && (projDept === userDept || projDept.includes(userDept) || userDept.includes(projDept));
          if (sameDept) {
            const author = (p.student_team_members || p.submitted_by_name || '').toLowerCase();
            const currentName = currentUser.name.toLowerCase().split(' ')[0];
            if (author.includes(currentName)) return true;
          }
        }
        return false;
      })
    : [];

  const dashboardHasPendingProjects = dashboardProjectList
    ? dashboardProjectList.some((project) => project.status === 'pending')
    : false;
  const dashboardFallbackMetrics = dashboardData && dashboardData.metrics ? dashboardData.metrics : {};
  const dashboardCounts = dashboardProjectList
    ? window.dashboardUtils.getProjectCounts(dashboardProjectList)
    : {
      total: Number.isFinite(dashboardFallbackMetrics.total) ? dashboardFallbackMetrics.total : null,
      awaitingRicReview: Number.isFinite(dashboardFallbackMetrics.pending) ? dashboardFallbackMetrics.pending : null
    };
  const dashboardApprovedCount = dashboardProjectList
    ? dashboardProjectList.filter((p) => p.status === 'approved' || p.status === 'allocated' || p.status === 'completed').length
    : 0;
  const dashboardActiveCount = dashboardProjectList
    ? dashboardProjectList.filter((p) => p.status === 'ongoing' || p.status === 'guide_reviewed').length
    : 0;
  const projectFaculty = faculty.filter((person) =>
    person.department_id === projectForm.department_id && person.is_active !== false
  );

  const selectedDepartment = departments.find((dept) => dept.id === projectForm.department_id);
  const availableProgrammes = selectedDepartment && Array.isArray(selectedDepartment.programmes)
    ? selectedDepartment.programmes.flatMap((prog) => {
        if (prog.specializations && prog.specializations.length > 0) {
          return prog.specializations.map((spec) => `${prog.name} — ${spec}`);
        }
        return [prog.name];
      })
    : [];

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await window.api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchInstitutionData = async () => {
    setInstitutionLoading(true);
    setInstitutionError('');
    try {
      const [departmentDirectory, facultyRecords, courseList, guideList] = await Promise.all([
        window.api.getDepartments(),
        window.api.getPermittedFaculty(),
        window.api.getCourses().catch(() => []),
        window.api.getGuides().catch(() => [])
      ]);
      const departmentRecords = Array.isArray(departmentDirectory.departments)
        ? departmentDirectory.departments
        : [];
      setDepartments(Array.isArray(departmentRecords) ? departmentRecords : []);
      setUnassignedProgrammes(Array.isArray(departmentDirectory.unassignedProgrammes)
        ? departmentDirectory.unassignedProgrammes
        : []);
      setFaculty(Array.isArray(facultyRecords) ? facultyRecords : []);
      setCourses(Array.isArray(courseList) ? courseList : []);
      setGuides(Array.isArray(guideList) ? guideList : []);
      if (!selectedDepartmentId && departmentRecords.length) {
        setSelectedDepartmentId(departmentRecords[0].id);
      }
      if (isInstitutionManager(currentUser)) {
        setDepartmentSummary(await window.api.getDepartmentSummary());
      } else {
        setDepartmentSummary(null);
      }
    } catch (err) {
      setInstitutionError(err.message || 'Unable to load department and faculty records.');
    } finally {
      setInstitutionLoading(false);
    }
  };

  const fetchGuideProposals = async () => {
    setGuideProposalsLoading(true);
    try {
      const list = await window.api.getAssignedGuideProposals();
      setGuideProposals(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load assigned guide proposals:', err);
      setGuideProposals([]);
    } finally {
      setGuideProposalsLoading(false);
    }
  };

  const handleOpenGuideReview = (project) => {
    setSelectedGuideProject(project);
    setGuideReviewForm({
      recommendation: (project.guide_review && project.guide_review.status) || 'recommended',
      comments: (project.guide_review && project.guide_review.comments) || ''
    });
    setGuideReviewError('');
  };

  const handleSubmitGuideReview = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedGuideProject) return;
    setGuideReviewSubmitting(true);
    setGuideReviewError('');
    try {
      const res = await window.api.submitGuideReview(selectedGuideProject._id, guideReviewForm);
      setSelectedGuideProject(null);
      await fetchGuideProposals();
      await fetchDashboard();
      alert(res.message || 'Guide review successfully submitted!');
    } catch (err) {
      setGuideReviewError(err.message || 'Failed to submit guide review.');
    } finally {
      setGuideReviewSubmitting(false);
    }
  };

  const handleOpenOfficialDecision = (project) => {
    setSelectedDecisionProject(project);
    setOfficialDecisionForm({
      decision: project.status === 'approved' ? 'approved' : 'approved',
      comments: '',
      reasons: '',
      conditions: '',
      signatory_name: currentUser ? currentUser.name : 'Rev. Fr. Principal & RIC Head',
      signatory_title: 'Head, Research & Innovation Cell / Principal'
    });
    setOfficialDecisionError('');
  };

  const handleSubmitOfficialDecision = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedDecisionProject) return;
    setOfficialDecisionSubmitting(true);
    setOfficialDecisionError('');
    try {
      const res = await window.api.submitOfficialDecision(selectedDecisionProject._id, officialDecisionForm);
      setSelectedDecisionProject(null);
      if (res.approval_letter) {
        setViewApprovalLetterProject(res.project);
      }
      await fetchDashboard();
      alert(res.message || 'Official RIC Council decision recorded!');
    } catch (err) {
      setOfficialDecisionError(err.message || 'Failed to record official decision.');
    } finally {
      setOfficialDecisionSubmitting(false);
    }
  };

  const handleOpenPanelInterview = (project) => {
    setPanelInterviewProject(project);
    const existing = project.panel_interview || {};
    const defaultSignatory = currentUser ? currentUser.name : 'Ansu Maria Benny & Dr. Angelin Thomas';
    const initialMembers = existing.panel_members ||
      (currentUser ? `${currentUser.name} (RIC Member), Dr. Angelin Thomas (RIC Member)` : 'RIC Evaluation Committee');

    const defaultScores = existing.viva_scores || {
      presentation: 18,
      methodology: 18,
      defense: 18,
      feasibility: 18,
      novelty: 18
    };
    const total = existing.total_score || Object.values(defaultScores).reduce((a, b) => a + Number(b), 0);

    setPanelForm({
      interview_date: existing.interview_date ? existing.interview_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      interview_venue: existing.interview_venue || 'Research & Innovation Cell (RIC) Room',
      interview_mode: existing.interview_mode || 'In-Person Oral Defense & Viva Voce',
      panel_members: initialMembers,
      viva_scores: defaultScores,
      total_score: total,
      panel_observations: existing.panel_observations || 'Candidate defended the research proposal satisfactorily before the RIC evaluation committee.',
      decision: project.status === 'approved' ? 'approved' : 'approved',
      conditions: (project.approval_letter && project.approval_letter.conditions) || (existing.conditions || ''),
      signatory_name: defaultSignatory,
      signatory_title: 'Head, Research & Innovation Cell / Principal'
    });
    setPanelError('');
  };

  const handleUpdateVivaScore = (dimension, val) => {
    const num = Math.max(0, Math.min(20, Number(val) || 0));
    const nextScores = { ...panelForm.viva_scores, [dimension]: num };
    const nextTotal = Object.values(nextScores).reduce((a, b) => a + Number(b), 0);
    setPanelForm({
      ...panelForm,
      viva_scores: nextScores,
      total_score: nextTotal
    });
  };

  const handleSubmitPanelInterview = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!panelInterviewProject) return;
    setPanelSubmitting(true);
    setPanelError('');
    try {
      const payload = {
        is_panel_interview: true,
        decision: panelForm.decision,
        interview_date: panelForm.interview_date,
        interview_venue: panelForm.interview_venue,
        interview_mode: panelForm.interview_mode,
        panel_members: panelForm.panel_members,
        viva_scores: panelForm.viva_scores,
        total_score: panelForm.total_score,
        panel_observations: panelForm.panel_observations,
        comments: panelForm.panel_observations,
        conditions: panelForm.conditions,
        signatory_name: panelForm.signatory_name,
        signatory_title: panelForm.signatory_title
      };

      const res = await window.api.submitOfficialDecision(panelInterviewProject._id || panelInterviewProject.project_code, payload);
      const updatedProject = res.project || {
        ...panelInterviewProject,
        status: panelForm.decision,
        panel_interview: res.official_decision?.panel_interview,
        approval_letter: res.approval_letter
      };
      setPanelInterviewProject(null);
      await fetchDashboard(true);
      if (selectedProject && (selectedProject._id === panelInterviewProject._id || selectedProject.project_code === panelInterviewProject.project_code)) {
        setSelectedProject(updatedProject);
      }
      if (res.approval_letter) {
        setViewApprovalLetterProject(updatedProject);
      }
    } catch (err) {
      setPanelError(err.message || 'Failed to record panel interview approval.');
    } finally {
      setPanelSubmitting(false);
    }
  };

  const handleSaveCourse = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setInstitutionSaving(true);
    try {
      await window.api.saveCourse(courseForm, editingCourseId);
      setCourseForm({ name: '', code: '', level: 'UG', department_id: '' });
      setEditingCourseId('');
      const updatedCourses = await window.api.getCourses();
      setCourses(updatedCourses);
      setInstitutionNotice('Master course successfully saved.');
    } catch (err) {
      setInstitutionError(err.message || 'Failed to save course.');
    } finally {
      setInstitutionSaving(false);
    }
  };

  const handleUpdateGuideCapacity = async (facultyId, newCap) => {
    try {
      await window.api.updateGuideCapacity(facultyId, newCap);
      const updatedGuides = await window.api.getGuides();
      setGuides(updatedGuides);
      setInstitutionNotice('Guide capacity updated.');
    } catch (err) {
      setInstitutionError(err.message || 'Failed to update guide capacity.');
    }
  };

  const startDepartmentEdit = (department) => {
    setSelectedDepartmentId(department.id);
    setDepartmentForm({ name: department.name, code: department.code });
    setEditingDepartmentId(department.id);
    setInstitutionError('');
    setInstitutionNotice('');
  };

  const cancelDepartmentEdit = () => {
    setDepartmentForm({ name: '', code: '' });
    setEditingDepartmentId('');
  };

  const handleSaveDepartment = async (event) => {
    event.preventDefault();
    setInstitutionSaving(true);
    setInstitutionError('');
    setInstitutionNotice('');
    try {
      const department = await window.api.saveDepartment(departmentForm, editingDepartmentId);
      setSelectedDepartmentId(department.id);
      setInstitutionNotice(`${department.name} saved.`);
      cancelDepartmentEdit();
      await fetchInstitutionData();
      setSelectedDepartmentId(department.id);
    } catch (err) {
      setInstitutionError(err.message || 'Unable to save department.');
    } finally {
      setInstitutionSaving(false);
    }
  };

  const startFacultyEdit = (person) => {
    setFacultyForm({
      name: person.name,
      email: person.email || '',
      designation: person.designation || '',
      department_id: person.department_id
    });
    setEditingFacultyId(person.id);
    setInstitutionError('');
    setInstitutionNotice('');
  };

  const cancelFacultyEdit = () => {
    setFacultyForm({
      name: '',
      email: '',
      designation: '',
      department_id: selectedDepartmentId
    });
    setEditingFacultyId('');
  };

  const handleSaveFaculty = async (event) => {
    event.preventDefault();
    setInstitutionSaving(true);
    setInstitutionError('');
    setInstitutionNotice('');
    try {
      const person = await window.api.savePermittedFaculty(
        { ...facultyForm, department_id: selectedDepartmentId },
        editingFacultyId
      );
      setInstitutionNotice(`${person.name} saved to the permitted faculty list.`);
      cancelFacultyEdit();
      await fetchInstitutionData();
    } catch (err) {
      setInstitutionError(err.message || 'Unable to save faculty record.');
    } finally {
      setInstitutionSaving(false);
    }
  };

  const updateProjectDepartment = (departmentId) => {
    const department = departments.find((item) => item.id === departmentId);
    let defaultProg = '';
    if (department && Array.isArray(department.programmes) && department.programmes.length > 0) {
      const firstProg = department.programmes[0];
      if (firstProg.specializations && firstProg.specializations.length > 0) {
        defaultProg = `${firstProg.name} — ${firstProg.specializations[0]}`;
      } else {
        defaultProg = firstProg.name;
      }
    }
    setProjectForm({
      ...projectForm,
      department_id: departmentId,
      department: department ? department.name : '',
      programme: defaultProg,
      lead_faculty_id: '',
      lead_investigator: '',
      guide_teacher: '',
      team_member_ids: [],
      team_members: ''
    });
    setSimilarityMatches([]);
    setSimilarityChecked(false);
    setSimilarityNotice('');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthSubmitting(true);

    try {
      const data = await window.api.login(loginEmail, loginPassword);
      localStorage.setItem('iripgms_token', data.token);
      localStorage.setItem('iripgms_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthError('');
      setAuthSubmitting(true);
      const authUrl = await window.api.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      setAuthError(err.message || 'Could not initiate Google Sign-in.');
      setAuthSubmitting(false);
    }
  };

  // Initialize Google Identity Services (GIS) on Login Screen
  useEffect(() => {
    let isMounted = true;
    async function setupGIS() {
      try {
        const config = await window.api.getGoogleConfig();
        if (!config || !config.clientId) return;

        function tryRender() {
          if (!window.google?.accounts?.id) {
            setTimeout(tryRender, 300);
            return;
          }
          if (!isMounted) return;

          window.google.accounts.id.initialize({
            client_id: config.clientId,
            callback: async (response) => {
              if (!response || !response.credential) return;
              try {
                setAuthSubmitting(true);
                setAuthError('');
                const data = await window.api.loginWithGoogle(response.credential);
                localStorage.setItem('iripgms_token', data.token);
                localStorage.setItem('iripgms_user', JSON.stringify(data.user));
                setCurrentUser(data.user);
              } catch (err) {
                setAuthError(err.message || 'Google Sign-in failed.');
              } finally {
                setAuthSubmitting(false);
              }
            }
          });

          const container = document.getElementById('google-signin-gis-box');
          if (container && window.google?.accounts?.id) {
            window.google.accounts.id.renderButton(container, {
              theme: 'outline',
              size: 'large',
              width: 340,
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'center'
            });
            setGisLoaded(true);
          }
        }
        tryRender();
      } catch (err) {
        console.warn('Google Identity initialization notice:', err.message);
      }
    }

    if (!currentUser && authMode === 'login') {
      setupGIS();
    }
    return () => { isMounted = false; };
  }, [currentUser, authMode]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setRegSubmitting(true);

    try {
      const data = await window.api.register(regForm);
      localStorage.setItem('iripgms_token', data.token);
      localStorage.setItem('iripgms_user', JSON.stringify(data.user));
      setAuthSuccess('Account registered successfully! Welcome to BVM Holy Cross College IRIPGMS.');
      setTimeout(() => {
        setCurrentUser(data.user);
      }, 600);
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotError('');
    setForgotSuccess('');
    setForgotSubmitting(true);
    try {
      const res = await window.api.forgotPassword(forgotEmail);
      setForgotSuccess(res.message || 'A 6-digit verification code has been dispatched to your email.');
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message || 'Failed to request password reset code.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!forgotCode || !forgotCode.trim()) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }
    setForgotError('');
    setForgotSuccess('');
    setForgotSubmitting(true);
    try {
      const res = await window.api.resetPassword(forgotEmail, forgotCode, forgotNewPassword);
      setAuthSuccess(res.message || 'Password successfully updated! Please log in.');
      setLoginEmail(forgotEmail);
      setLoginPassword('');
      setAuthMode('login');
      setForgotStep(1);
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotError('');
      setForgotSuccess('');
    } catch (err) {
      setForgotError(err.message || 'Failed to update password.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await window.api.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
    setUsers([]);
    setDashboardData(null);
    setDashboardProjects(null);
    setDashboardProjectsError('');
    setDashboardProjectsLoading(false);
    setAuthMode('login');
    setAuthSuccess('');
    setAuthError('');
  };

  const handleQuickRoleSwitch = async (email) => {
    try {
      const data = await window.api.login(email, 'Admin@12345');
      setCurrentUser(data.user);
      setActiveTab('dashboard');
      await fetchDashboard(false);
      if (['ric_head', 'ric_admin', 'ric_member', 'admin'].includes(data.user.role)) {
        fetchUsers();
      }
      if (['ric_head', 'ric_admin', 'ric_member', 'admin'].includes(data.user.role)) {
        fetchCommitteeReviewers();
      }
    } catch (err) {
      console.error('Role switch error:', err);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    const actionVerb = newStatus ? 'restore access for' : 'suspend access for';
    const confirmPrompt = window.confirm(`Are you sure you want to ${actionVerb} ${user.name} (${user.email})?`);
    if (!confirmPrompt) return;

    const actionLabel = newStatus ? 'activated (access restored)' : 'suspended';

    try {
      await window.api.updateUserStatus(user._id || user.id, newStatus);
      setActionMessage({
        type: 'success',
        text: `Account for ${user.name} has been successfully ${actionLabel}.`
      });
      fetchUsers();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || `Failed to update account status for ${user.name}.`
      });
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Permanently delete account for ${user.name} (${user.email})? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await window.api.deleteUser(user._id || user.id);
      setActionMessage({
        type: 'success',
        text: `Account for ${user.name} has been permanently deleted.`
      });
      fetchUsers();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || `Failed to delete account for ${user.name}.`
      });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSubmitting(true);

    try {
      await window.api.createUser(createForm);
      setActionMessage({
        type: 'success',
        text: `New user account created successfully for ${createForm.name}.`
      });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'student',
        designation: 'Student',
        department: 'Department of Computer Applications'
      });
      fetchUsers();
    } catch (err) {
      setCreateError(err.message || 'Failed to create user account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold badge-role-ric">
            🏛️ RIC Administrator
          </span>
        );
      case 'ric_head':
      case 'ric_admin':
      case 'ric_member':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold badge-role-ric">
            🛡️ RIC Member
          </span>
        );
      case 'guide':
      case 'faculty_principal':
      case 'institutional_user':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold badge-role-faculty">
            👨‍🏫 Staff
          </span>
        );
      case 'student':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold badge-role-student">
            🎓 Student
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            ⏳ Pending Scrutiny
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            ✅ Council Approved
          </span>
        );
      case 'changes_requested':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
            📝 Changes Requested
          </span>
        );
      case 'ongoing':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            🚀 Ongoing Progress
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            🏆 Completed & Certified
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Status unavailable{status ? ` (${status})` : ''}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-800">
        <img
          src="/images/bvm-logo.jpg"
          alt="BVM Holy Cross College"
          className="h-16 object-contain mb-4 rounded shadow-2xs"
        />
        <div className="w-8 h-8 border-3 border-[#072b54] border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="font-collegiate text-sm font-bold text-[#072b54]">
          BISHOP VAYALIL MEMORIAL HOLY CROSS COLLEGE, CHERPUNKAL
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Loading Institutional Research, Innovation and Project Governance Management System...
        </p>
      </div>
    );
  }

  // Filtered users for admin management
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole =
      roleFilter === 'all' ||
      u.role === roleFilter ||
      (roleFilter === 'ric_member' && ['ric_head', 'ric_admin', 'ric_member'].includes(u.role)) ||
      (roleFilter === 'admin' && ['admin', 'ric_head', 'ric_admin'].includes(u.role)) ||
      (roleFilter === 'faculty_principal' && ['faculty_principal', 'institutional_user', 'guide'].includes(u.role));
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 w-full">
      {/* ===================================================================== */}
      {/* 2. OFFICIAL WHITE MASTHEAD (SINGLE EMBLEM)                             */}
      {/* ===================================================================== */}
      <header className="w-full bg-white border-b border-slate-200 shadow-2xs">
        <div className="w-full px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Official Emblem Banner + Portal Title (No Duplication) */}
          <div className="flex items-center gap-3.5">
            <img
              src="/images/bvm-logo.jpg"
              alt="Bishop Vayalil Memorial Holy Cross College Banner"
              className="h-12 sm:h-14 w-auto object-contain rounded"
            />
            <div className="masthead-identity border-l-2 border-slate-200 pl-3.5">
              <div className="text-[10px] sm:text-sm font-bold uppercase tracking-wider text-[#072b54] font-collegiate">
                Research & Innovation Cell (RIC)
              </div>
              <div className="text-[9px] sm:text-[11px] text-slate-500 font-medium leading-snug">
                Institutional Research, Innovation & Project Governance (IRIPGMS)
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3.5 text-xs">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px] border border-slate-200">
              <span>Academic Year: <strong>2026–27</strong></span>
            </div>

            {currentUser && (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="text-right">
                  <div className="font-bold text-[#072b54] text-xs">{currentUser.name}</div>
                  <div className="text-slate-500 text-[11px] font-mono">{currentUser.email}</div>
                </div>
                {/* Role Switcher for Multi-Role Inspection */}
                <div className="relative group">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Switch between the 3 official institutional roles"
                  >
                    <span>🔄</span> Switch Role
                  </button>
                  <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-2 hidden group-hover:block z-50 text-xs space-y-1">
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                      Institutional Roles
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickRoleSwitch('bansumaria@gmail.com')}
                      className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between cursor-pointer transition ${
                        currentUser.email === 'bansumaria@gmail.com' ? 'bg-indigo-100 text-indigo-950 font-bold' : 'hover:bg-indigo-50 text-slate-800'
                      }`}
                    >
                      <span>🏛️ Ansu Maria Benny (Admin)</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold">RIC Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRoleSwitch('ansu@bvmcollege.com')}
                      className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between cursor-pointer transition ${
                        currentUser.email === 'ansu@bvmcollege.com' ? 'bg-purple-100 text-purple-950 font-bold' : 'hover:bg-purple-50 text-slate-800'
                      }`}
                    >
                      <span>🛡️ Ansu Maria Benny (Asst. Prof)</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono font-bold">RIC Member</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRoleSwitch('angelin.thomas@gmail.com')}
                      className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between cursor-pointer transition ${
                        currentUser.email === 'angelin.thomas@gmail.com' ? 'bg-emerald-100 text-emerald-950 font-bold' : 'hover:bg-emerald-50 text-slate-800'
                      }`}
                    >
                      <span>🛡️ Dr. Angelin Thomas (Asst. Prof)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">RIC Member</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-lg bg-[#072b54] hover:bg-rose-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}

            
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. CLASSIC ACADEMIC NAVIGATION BAR (WHEN LOGGED IN)                 */}
        {/* =================================================================== */}
        {currentUser && (
          <nav className="w-full bg-[#0a3666] text-white px-4 sm:px-8 flex items-center justify-between text-xs font-semibold overflow-x-auto shadow-inner">
            <div className="flex items-center">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
                  activeTab === 'dashboard'
                    ? 'border-amber-400 bg-white/10 text-white font-bold'
                    : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>📊</span> Research Dashboard
              </button>

              {canSubmitProject(currentUser) && (
                <button
                  onClick={() => openProjectRegistration()}
                  className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'register-project'
                      ? 'border-amber-400 bg-white/10 text-white font-bold'
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>📝</span> Project Registration
                </button>
              )}

              {isRICMember(currentUser) && (
                <button
                  onClick={() => setActiveTab('similarity-scan')}
                  className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'similarity-scan'
                      ? 'border-amber-400 bg-white/10 text-white font-bold'
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🤖</span> AI Similarity Scanner
                </button>
              )}

              {isRICMember(currentUser) && (
                <button
                  onClick={() => setActiveTab('review-evaluation')}
                  className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'review-evaluation'
                      ? 'border-amber-400 bg-white/10 text-white font-bold'
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>⚖️</span> RIC Review & Evaluation
                </button>
              )}

              {(isFaculty(currentUser) || isRICMember(currentUser)) && (
                <button
                  onClick={() => {
                    setActiveTab('guide-review');
                    fetchGuideProposals();
                  }}
                  className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'guide-review'
                      ? 'border-amber-400 bg-white/10 text-white font-bold'
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🧑‍🏫</span> Guide Review
                </button>
              )}

              {isRICHead(currentUser) && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'users'
                      ? 'border-amber-400 bg-white/10 text-white font-bold'
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>👥</span> User Governance
                </button>
              )}
              {isInstitutionManager(currentUser) && (
                <button
                  onClick={() => {
                    setActiveTab('institution');
                    fetchInstitutionData();
                  }}
                  className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'institution'
                      ? 'border-amber-400 bg-white/10 text-white font-bold'
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🏢</span> Institution & Departments
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300 py-2">
              <span>Signed in as:</span>
              <strong className="text-amber-300">{currentUser.name}</strong>
              <span className="text-slate-400">({currentUser.role})</span>
            </div>
          </nav>
        )}
      </header>

      {/* ===================================================================== */}
      {/* 4. MAIN VIEWPORT (FULL-PAGE FLUID ACADEMIC LAYOUT)                   */}
      {/* ===================================================================== */}
      <main className="flex-1 w-full px-4 sm:px-8 py-6">
        {!currentUser ? (
          /* =================================================================== */
          /* ACADEMIC HOME AND AUTHENTICATION                                   */
          /* =================================================================== */
          <div className="landing-page">
            <div className="landing-top">
            <section className="landing-hero" aria-labelledby="landing-title">
              <div className="landing-hero-inner">
                <p className="landing-eyebrow">
                  <span aria-hidden="true"></span>
                  BVM Holy Cross College · Cherpunkal
                </p>
                <h1 id="landing-title" className="landing-title font-collegiate">Research starts here.</h1>
                <p className="landing-description">
                  Submit, review and follow college research projects in one place.
                </p>
              </div>
            </section>

            <section className="landing-auth" id="account-access" aria-label="Account access">
              <div className="standard-card landing-card p-6 sm:p-8 bg-white border-slate-300 shadow-md">
                <div className="landing-card-heading">
                  <p className="landing-card-kicker">Institutional portal</p>
                  <h2 className="font-collegiate">Welcome</h2>
                  <p>Sign in to continue to your research workspace.</p>
                </div>

              {/* Mode Selector Tabs */}
              <div className="landing-auth-tabs grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 border border-slate-200 mb-6" role="group" aria-label="Account access options">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  aria-pressed={authMode === 'login'}
                  className={`py-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 ${
                    authMode === 'login'
                      ? 'bg-[#072b54] text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🔐</span> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  aria-pressed={authMode === 'register'}
                  className={`py-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 ${
                    authMode === 'register'
                      ? 'bg-[#072b54] text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>📝</span> Register User
                </button>
              </div>

              {/* Status / Error Alerts */}
              {authError && (
                <div role="alert" className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div role="status" className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <span>✅</span>
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* SIGN IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 text-xs">
                  <div>
                    <label htmlFor="login-email" className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      College Email Address *
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="e.g. yourname@gmail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="Enter account password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#072b54] pr-14"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        className="absolute right-3 top-2.5 text-[11px] font-bold text-[#072b54] hover:underline"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot-password');
                          setForgotEmail(loginEmail || '');
                          setForgotStep(1);
                          setForgotError('');
                          setForgotSuccess('');
                        }}
                        className="text-[11px] font-semibold text-[#072b54] hover:text-[#0a3666] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-2.5 mt-2 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white font-bold text-xs tracking-wider uppercase transition shadow-2xs disabled:opacity-50"
                  >
                    {authSubmitting ? 'Authenticating...' : 'Sign In to Portal →'}
                  </button>

                  {/* Institutional Single Sign-On (Google Sign-In) */}
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">or sign in with</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div id="google-signin-gis-box" className={`w-full flex justify-center min-h-[44px] ${gisLoaded ? '' : 'hidden'}`}></div>

                    {!gisLoaded && (
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={authSubmitting}
                        className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-2xs cursor-pointer hover:border-slate-400"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <span className="text-slate-500 text-xs">New user? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className="text-[#072b54] hover:underline font-bold text-xs"
                    >
                      Register here
                    </button>
                  </div>

                  {/* Institutional Role Portals (3 Official Roles) */}
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                      <span>🏛️ Institutional Roles (BVM Holy Cross)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Click to quick-fill</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail('bansumaria@gmail.com');
                          setLoginPassword('Admin@12345');
                        }}
                        className="w-full text-left p-2 rounded-lg bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200 text-slate-800 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-indigo-950 block text-[11px]">🏛️ Ansu Maria Benny (RIC Administrator)</strong>
                          <span className="text-slate-500 text-[10px] font-mono">bansumaria@gmail.com</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded font-mono">
                          Admin@12345
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail('ansu@bvmcollege.com');
                          setLoginPassword('Ansu@12345');
                        }}
                        className="w-full text-left p-2 rounded-lg bg-purple-50/80 hover:bg-purple-100/90 border border-purple-200 text-slate-800 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-purple-950 block text-[11px]">🛡️ Ansu Maria Benny, Assistant Professor (RIC Member)</strong>
                          <span className="text-slate-500 text-[10px] font-mono">ansu@bvmcollege.com</span>
                        </div>
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded font-mono">
                          Ansu@12345
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail('angelin.thomas@gmail.com');
                          setLoginPassword('Admin@12345');
                        }}
                        className="w-full text-left p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 text-slate-800 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-emerald-950 block text-[11px]">🛡️ Dr. Angelin Thomas, Assistant Professor (RIC Member)</strong>
                          <span className="text-slate-500 text-[10px] font-mono">angelin.thomas@gmail.com</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                          Admin@12345
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* FORGOT PASSWORD / PASSWORD RESET FORM */}
              {authMode === 'forgot-password' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-[#072b54] uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                      <span>🔒</span> Reset Account Password
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setForgotError('');
                        setForgotSuccess('');
                      }}
                      className="text-[#072b54] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      ← Back to Sign In
                    </button>
                  </div>

                  {forgotError && (
                    <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                      <span>✅</span>
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  {forgotStep === 1 && (
                    <form onSubmit={handleForgotPassword} className="space-y-3.5">
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Enter your registered institutional or Gmail address. We will dispatch a <strong>6-digit verification code</strong> via Gmail to verify your identity.
                      </p>

                      <div>
                        <label htmlFor="forgot-email" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Email Address *
                        </label>
                        <input
                          id="forgot-email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="e.g. yourname@gmail.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={forgotSubmitting}
                        className="w-full py-2.5 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white font-bold text-xs tracking-wider uppercase transition shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {forgotSubmitting ? 'Dispatching Verification Code...' : 'Send Verification Code →'}
                      </button>
                    </form>
                  )}

                  {forgotStep === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-3.5">
                      <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-[11px] text-blue-900">
                        Verification code dispatched to: <strong className="font-mono">{forgotEmail}</strong>
                        <button
                          type="button"
                          onClick={() => { setForgotStep(1); setForgotError(''); }}
                          className="ml-2 text-blue-700 underline font-semibold cursor-pointer"
                        >
                          (Change)
                        </button>
                      </div>

                      <div>
                        <label htmlFor="forgot-code" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                          6-Digit Verification Code *
                        </label>
                        <input
                          id="forgot-code"
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={forgotCode}
                          onChange={(e) => setForgotCode(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-widest rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>

                      <div>
                        <label htmlFor="forgot-new-password" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                          New Password * (Min. 6 characters)
                        </label>
                        <input
                          id="forgot-new-password"
                          type="password"
                          required
                          minLength={6}
                          placeholder="Enter new password"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>

                      <div>
                        <label htmlFor="forgot-confirm-password" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Confirm New Password *
                        </label>
                        <input
                          id="forgot-confirm-password"
                          type="password"
                          required
                          minLength={6}
                          placeholder="Re-enter new password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={forgotSubmitting}
                        className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wider uppercase transition shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {forgotSubmitting ? 'Updating Password...' : 'Save & Set New Password ✓'}
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={forgotSubmitting}
                          className="text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer"
                        >
                          Didn't receive code? Resend
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* REGISTRATION FORM (3 CORE ROLES) */}
              {authMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                  <div>
                    <label htmlFor="register-name" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="e.g. Ansu Maria Benny / Student Scholar"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div>
                    <label htmlFor="register-email" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      College Email Address *
                    </label>
                    <input
                      id="register-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="e.g. yourname@gmail.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div>
                    <label htmlFor="register-role" className="block font-bold text-[#072b54] uppercase tracking-wider mb-1">
                      Institutional Role *
                    </label>
                    <select
                      id="register-role"
                      value={regForm.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setRegForm({
                          ...regForm,
                          role: newRole,
                          designation: newRole === 'student' ? '1st Year UG' : 'Assistant Professor'
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border-2 border-blue-400 bg-blue-50/50 text-[#072b54] font-semibold focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    >
                      <option value="student">
                        🎓 Student
                      </option>
                      <option value="faculty_principal">
                        👨‍🏫 Staff
                      </option>
                    </select>
                    <p className="mt-1 text-[11px] font-normal text-slate-500">
                      RIC member and administrator accounts are assigned by the Research Cell.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="register-department" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Department *
                      </label>
                      <select
                        id="register-department"
                        value={regForm.department}
                        onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                        className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                      >
                        {OFFICIAL_INSTITUTIONAL_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="register-designation" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                        {regForm.role === 'student' ? 'Class / Year *' : 'Faculty Designation *'}
                      </label>
                      {regForm.role === 'student' ? (
                        <select
                          id="register-designation"
                          value={regForm.designation}
                          onChange={(e) => setRegForm({ ...regForm, designation: e.target.value })}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        >
                          <option value="1st Year UG">1st Year UG</option>
                          <option value="2nd Year UG">2nd Year UG</option>
                          <option value="3rd Year UG (Final Year)">3rd Year UG (Final Year)</option>
                          <option value="1st Year PG">1st Year PG</option>
                          <option value="2nd Year PG (Final Year)">2nd Year PG (Final Year)</option>
                          <option value="Integrated Programme">Integrated Programme</option>
                        </select>
                      ) : (
                        <select
                          id="register-designation"
                          value={regForm.designation}
                          onChange={(e) => setRegForm({ ...regForm, designation: e.target.value })}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        >
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Professor">Professor</option>
                          <option value="Head of the Department (HOD)">Head of the Department (HOD)</option>
                          <option value="Guest Lecturer / Faculty">Guest Lecturer / Faculty</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="register-password" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Password (Min 6 Characters) *
                    </label>
                    <input
                      id="register-password"
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={regSubmitting}
                    className="w-full py-2.5 mt-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wider uppercase transition shadow-2xs disabled:opacity-50"
                  >
                    {regSubmitting ? 'Registering...' : 'Complete Registration & Sign In →'}
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-slate-500 text-xs">Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className="text-[#072b54] hover:underline font-bold text-xs"
                    >
                      Sign in here
                    </button>
                  </div>
                </form>
              )}
              </div>
            </section>
            </div>
            <section className="landing-process" aria-labelledby="landing-process-title">
              <div className="landing-process-heading">
                <p className="landing-card-kicker">A clear, accountable path</p>
                <h2 id="landing-process-title" className="font-collegiate">How it works</h2>
              </div>
              <ol className="landing-process-steps">
                <li>
                  <span className="landing-process-number" aria-hidden="true">01</span>
                  <div>
                    <h3>Student submits</h3>
                    <p>Share a project proposal through the portal.</p>
                  </div>
                </li>
                <li>
                  <span className="landing-process-number" aria-hidden="true">02</span>
                  <div>
                    <h3>RIC reviews</h3>
                    <p>Authorized RIC members review proposals and make approval decisions.</p>
                  </div>
                </li>
                <li>
                  <span className="landing-process-number" aria-hidden="true">03</span>
                  <div>
                    <h3>Track progress</h3>
                    <p>Students and faculty follow progress and view permitted project information.</p>
                  </div>
                </li>
              </ol>
            </section>
          </div>
        ) : (
          /* =================================================================== */
          /* AUTHENTICATED WORKSPACE (MODULES 1 & 2)                             */
          /* =================================================================== */
          <div className="w-full space-y-6">
            {/* Action Alert Banner */}
            {actionMessage && (
              <div
                className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-2xs ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>{actionMessage.text}</span>
                <button onClick={() => setActionMessage(null)} className="font-bold px-2 hover:opacity-75">✕</button>
              </div>
            )}

            

            {/* Standard User Identity Strip */}
            {activeTab !== 'dashboard' && (
              <div className="standard-card p-4 sm:p-5 bg-white border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-[#072b54] text-white font-black text-lg flex items-center justify-center font-collegiate">
                    {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-collegiate text-base font-bold text-[#072b54]">
                        {currentUser.name}
                      </h2>
                      {getRoleBadge(currentUser.role)}
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-beacon"></span>
                        Active Session
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1 font-medium">
                      <span>📧 {currentUser.email}</span>
                      <span>💼 {currentUser.designation || 'Academic Member'}</span>
                      <span>🏢 {currentUser.department || 'BVM Holy Cross College'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 text-right">
                  <div>Institutional Portal: <strong>IRIPGMS v2.4</strong></div>
                  <div className="text-[11px]">BVM Holy Cross College, Cherpunkal</div>
                </div>
              </div>
            )}

            

            {/* ================================================================= */}
            {/* TAB 1: MODULE 2 DASHBOARD OVERVIEW (NO FUNDS / REAL-TIME DATA)    */}
            {/* ================================================================= */}
            {activeTab === 'dashboard' && !dashboardData && (
              <section className="standard-card dashboard-state" aria-live="polite">
                {dashboardLoading ? (
                  <>
                    <span className="dashboard-state-mark" aria-hidden="true">⌁</span>
                    <h2 className="font-collegiate">Preparing your project overview</h2>
                    <p>Loading the latest project and review information.</p>
                  </>
                ) : (
                  <>
                    <span className="dashboard-state-mark dashboard-state-error" aria-hidden="true">!</span>
                    <h2 className="font-collegiate">Dashboard unavailable</h2>
                    <p role="alert">{dashboardError || 'Project information could not be loaded.'}</p>
                    <button
                      onClick={() => fetchDashboard()}
                      className="dashboard-refresh-button"
                      type="button"
                    >
                      Try again
                    </button>
                  </>
                )}
              </section>
            )}
            {activeTab === 'dashboard' && dashboardData && (
              <div className="dashboard-view space-y-4">
                <header className="dashboard-heading flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border border-[#123b62] bg-linear-to-r from-[#041c38] to-[#072b54] text-white shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <p className="dashboard-eyebrow text-xs uppercase tracking-widest font-bold text-amber-400 m-0">
                        BVM Holy Cross College, Cherpunkal • Academic Session 2026–2027
                      </p>
                    </div>
                    <h1 className="font-collegiate text-xl sm:text-2xl font-bold tracking-tight text-white m-0">
                      Research & Project Dashboard
                    </h1>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                      Centralized repository and evaluation overview across all 9 academic teaching departments.
                    </p>
                  </div>
                  <div className="dashboard-heading-actions">
                    <button
                      type="button"
                      onClick={() => fetchDashboard()}
                      disabled={dashboardLoading}
                      className="dashboard-refresh-button cursor-pointer hover:bg-white/15 transition"
                      title="Fetch latest project status and metrics"
                    >
                      <span aria-hidden="true">{dashboardLoading ? '…' : '↻'}</span>
                      {dashboardLoading ? 'Refreshing…' : 'Refresh'}
                    </button>
                  </div>
                </header>

                {dashboardError && (
                  <div className="dashboard-error-banner" role="alert">
                    <span>{dashboardError} Showing the last available overview.</span>
                    <button type="button" onClick={() => fetchDashboard()} disabled={dashboardLoading}>
                      Retry
                    </button>
                  </div>
                )}

                <section className="dashboard-summary" aria-label="Project summary">
                  <article className="dashboard-summary-card dashboard-summary-total">
                    <div>
                      <span className="text-xs font-semibold text-slate-600 block">Total Proposals</span>
                      <span className="text-[11px] text-slate-400 font-normal">All 9 departments</span>
                    </div>
                    <strong className="text-2xl font-bold text-[#072b54]">{dashboardCounts.total === null ? '—' : dashboardCounts.total}</strong>
                  </article>

                  <article className="dashboard-summary-card dashboard-summary-pending">
                    <div>
                      <span className="text-xs font-semibold text-amber-800 block">Awaiting RIC Review</span>
                      <span className="text-[11px] text-amber-600 font-normal">Pending committee action</span>
                    </div>
                    <strong className="text-2xl font-bold text-amber-700">{dashboardCounts.awaitingRicReview === null ? '—' : dashboardCounts.awaitingRicReview}</strong>
                  </article>

                  <article className="dashboard-summary-card dashboard-summary-approved">
                    <div>
                      <span className="text-xs font-semibold text-emerald-800 block">Approved Proposals</span>
                      <span className="text-[11px] text-emerald-600 font-normal">Officially sanctioned</span>
                    </div>
                    <strong className="text-2xl font-bold text-emerald-700">{dashboardApprovedCount}</strong>
                  </article>

                  <article className="dashboard-summary-card dashboard-summary-active">
                    <div>
                      <span className="text-xs font-semibold text-blue-800 block">Active Mentorship</span>
                      <span className="text-[11px] text-blue-600 font-normal">Under faculty guidance</span>
                    </div>
                    <strong className="text-2xl font-bold text-blue-700">{dashboardActiveCount}</strong>
                  </article>
                </section>

                {/* Role-Specific Quick Actions */}
                {currentUser && isRICMember(currentUser) && (
                  <div className="standard-card p-4 sm:p-5 bg-linear-to-r from-amber-50/60 via-white to-blue-50/30 border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#072b54] text-amber-300 flex items-center justify-center font-bold text-lg shadow-2xs">
                        🏛️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-collegiate text-sm sm:text-base font-bold text-[#072b54]">
                            Research & Innovation Cell Operations
                          </h2>
                          {dashboardCounts.awaitingRicReview > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              {dashboardCounts.awaitingRicReview} Pending Evaluation
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Evaluate proposals, scan for similarity & plagiarism, and manage faculty guides.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('review-evaluation')}
                        className="px-3.5 py-2 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <span>⚖️</span> Review & Evaluation
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('similarity-scan')}
                        className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-[#072b54] border border-slate-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>🤖</span> Similarity Scanner
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('institution')}
                        className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-[#072b54] border border-slate-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>🏛️</span> Faculty Roster
                      </button>
                    </div>
                  </div>
                )}

                {currentUser && currentUser.role === 'student' && (
                  <div className="standard-card p-4 sm:p-5 bg-linear-to-r from-emerald-50/60 via-white to-blue-50/30 border-emerald-200/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                        🎓
                      </div>
                      <div>
                        <h2 className="font-collegiate text-sm sm:text-base font-bold text-emerald-950">
                          Student Research Portal
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Register proposals, view RIC feedback, and collaborate with your guide teacher.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openProjectRegistration(null)}
                      className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>➕</span> Submit New Proposal
                    </button>
                  </div>
                )}

                {dashboardData && (
                  <div className="dashboard-detail-sections space-y-4">
                    {/* Student & Own Proposals Section (Clean, no CRUD jargon) */}
                    {currentUser && (currentUser.role === 'student' || myProposals.length > 0) && (
                      <div className="standard-card overflow-hidden bg-white border-slate-200">
                        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base">📝</span>
                              <h2 className="font-collegiate text-sm sm:text-base font-bold text-[#072b54]">
                                My Research Proposals
                              </h2>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Track evaluation status, committee review remarks, and manage your submissions.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openProjectRegistration(null)}
                            className="px-3.5 py-2 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <span>➕</span> Submit New Proposal
                          </button>
                        </div>

                        {myProposals.length === 0 ? (
                          <div className="p-8 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 font-bold text-xl flex items-center justify-center mx-auto">
                              📝
                            </div>
                            <div>
                              <h3 className="font-collegiate text-sm font-bold text-slate-800">No proposals submitted under your account yet</h3>
                              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                As an enrolled researcher in <strong>{currentUser.department || 'your department'}</strong>, you can submit proposals for review.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openProjectRegistration(null)}
                              className="px-4 py-2 rounded-lg bg-[#072b54] text-white text-xs font-bold hover:bg-[#0a3666] transition cursor-pointer"
                            >
                              ➕ Submit Proposal
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="dashboard-simple-project-table w-full text-left text-xs text-slate-700">
                              <thead>
                                <tr>
                                  <th>Project Proposal</th>
                                  <th>Guide Teacher</th>
                                  <th>Category</th>
                                  <th>Status</th>
                                  <th>AI Similarity</th>
                                  <th className="text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {myProposals.map((proj) => {
                                  const canEdit = proj.status === 'pending' || proj.status === 'changes_requested';
                                  const topSimilarity = proj.similarity_score || (proj.similarity_matches && proj.similarity_matches[0] && proj.similarity_matches[0].score) || 0;
                                  return (
                                    <tr key={proj._id || proj.project_code} className="hover:bg-slate-50/70 transition">
                                      <td>
                                        <button
                                          type="button"
                                          className="dashboard-project-title text-left hover:text-[#072b54] hover:underline cursor-pointer font-bold text-slate-900"
                                          onClick={() => openProjectDossier(proj)}
                                        >
                                          {proj.title}
                                        </button>
                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                          {proj.project_code} {proj.programme ? `• ${proj.programme}` : ''}
                                        </div>
                                      </td>
                                      <td>{proj.guide_teacher || proj.lead_investigator || 'Faculty Mentor'}</td>
                                      <td><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{proj.category}</span></td>
                                      <td>{getStatusBadge(proj.status)}</td>
                                      <td>
                                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                          topSimilarity >= 50
                                            ? 'bg-rose-100 text-rose-800'
                                            : topSimilarity >= 25
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                          🤖 {topSimilarity}% Match
                                        </span>
                                      </td>
                                      <td className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => openProjectDossier(proj)}
                                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#072b54] hover:text-white text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                                            title="View proposal details"
                                          >
                                            👁️ Inspect
                                          </button>
                                          {canEdit && (
                                            <button
                                              type="button"
                                              onClick={() => openProjectRegistration(proj)}
                                              className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[11px] transition cursor-pointer"
                                              title="Edit proposal"
                                            >
                                              ✏️ Edit
                                            </button>
                                          )}
                                          {canEdit && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteProject(proj)}
                                              className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-[11px] transition cursor-pointer"
                                              title="Withdraw proposal"
                                            >
                                              🗑️ Withdraw
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Department Groups Accordion (All 9 Teaching Departments) */}
                    <div className="standard-card overflow-hidden bg-white">
                      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 dashboard-project-list-header flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="font-collegiate text-sm sm:text-base font-bold text-[#072b54]">
                            Institutional Projects by Department
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Proposals organized across all 9 academic teaching departments of BVM Holy Cross College.
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {dashboardDepartmentGroups ? dashboardDepartmentGroups.length : 0} Departments Active
                        </span>
                      </div>

                      {dashboardProjectsError && (
                        <div className="dashboard-project-list-error" role="alert">
                          {dashboardProjectsError}
                          {dashboardProjectList && ' Showing the last successfully loaded project list.'}
                        </div>
                      )}

                      {dashboardDepartmentGroups && dashboardDepartmentGroups.length > 0 && (
                        <div className="dashboard-department-groups">
                          {dashboardDepartmentGroups.map((group, index) => {
                            const pendingCount = group.projects.filter((p) => p.status === 'pending').length;
                            return (
                              <details
                                key={group.department}
                                className="dashboard-department-group"
                                open={
                                  group.projects.some((project) => project.status === 'pending') ||
                                  (!dashboardHasPendingProjects && index === 0)
                                }
                              >
                                <summary className="dashboard-department-group-heading">
                                  <span className="font-collegiate">{group.department}</span>
                                  <div className="flex items-center gap-2">
                                    {pendingCount > 0 && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        {pendingCount} awaiting review
                                      </span>
                                    )}
                                    <span className="text-xs text-slate-600 font-medium">{group.count} {group.count === 1 ? 'project' : 'projects'}</span>
                                  </div>
                                </summary>
                                <div className="overflow-x-auto">
                                  <table className="dashboard-simple-project-table w-full text-left text-xs text-slate-700">
                                    <thead>
                                      <tr>
                                        <th>Project Proposal</th>
                                        <th>Guide Teacher / PI</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Review Deadline</th>
                                        <th className="text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {group.projects.map((project) => {
                                        const isPendingReview = project.status === 'pending';
                                        const hasDeadline = isPendingReview && getValidTimestamp(project.review_deadline) !== null;
                                        return (
                                          <tr key={project.project_code} className="hover:bg-slate-50/70 transition">
                                            <td>
                                              <button
                                                type="button"
                                                className="dashboard-project-title text-left hover:text-[#072b54] hover:underline cursor-pointer font-medium text-slate-900"
                                                onClick={() => openProjectDossier(project)}
                                                title="Inspect full proposal dossier"
                                              >
                                                {project.title || 'Untitled project'}
                                              </button>
                                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                {project.project_code} {project.programme ? `• ${project.programme}` : ''}
                                              </div>
                                            </td>
                                            <td>{project.guide_teacher || project.lead_investigator || 'Not recorded'}</td>
                                            <td><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{project.category || 'Research'}</span></td>
                                            <td>{getStatusBadge(project.status)}</td>
                                            <td>
                                              {hasDeadline
                                                ? formatProjectDate(project.review_deadline, { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '—'}
                                            </td>
                                            <td className="dashboard-review-actions text-right">
                                              <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => openProjectDossier(project)}
                                                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#072b54] hover:text-white text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                                                  title="Inspect complete proposal dossier"
                                                >
                                                  👁️ Inspect
                                                </button>
                                                {(project.is_submitted_by_user || (currentUser && project.submitted_by === currentUser.id)) &&
                                                  (project.status === 'pending' || project.status === 'changes_requested') && (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={() => openProjectRegistration(project)}
                                                      className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[11px] transition cursor-pointer"
                                                      title="Edit proposal"
                                                    >
                                                      ✏️ Edit
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleDeleteProject(project)}
                                                      className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-[11px] transition cursor-pointer"
                                                      title="Withdraw proposal"
                                                    >
                                                      🗑️ Withdraw
                                                    </button>
                                                  </>
                                                )}
                                                {isRICMember(currentUser) && isPendingReview && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setActiveTab('review-evaluation');
                                                      setModule6DepartmentFilter(project.department);
                                                      setModule6Search(project.project_code || '');
                                                    }}
                                                    className="dashboard-approve-button px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1"
                                                    title="Open proposal in RIC Review & Evaluation workspace"
                                                  >
                                                    <span>⚖️</span> Review Queue
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      )}
                      {dashboardDepartmentGroups && !dashboardDepartmentGroups.length && (
                        <div className="dashboard-empty p-8 text-center text-slate-500 text-xs">
                          <strong>No projects visible for this department yet</strong>
                        </div>
                      )}
                      {!dashboardProjectList && (
                        <div className="dashboard-empty p-8 text-center text-slate-500 text-xs">
                          <strong>{dashboardProjectsLoading ? 'Loading projects…' : 'Project list unavailable'}</strong>
                          <span className="block mt-1">
                            {dashboardProjectsLoading
                              ? 'Loading projects across departments.'
                              : dashboardProjectsError || 'Project data is not available.'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            

            {activeTab === 'register-project' && canSubmitProject(currentUser) && (
              <form onSubmit={handleCreateProject} className="standard-card p-6 sm:p-8 bg-white border-slate-200 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                    <span>🏛️ BVM Holy Cross College, Cherpunkal</span>
                    <span>•</span>
                    <span>Research & Innovation Cell (RIC)</span>
                  </div>
                  <h3 className="font-collegiate text-xl font-bold text-[#072b54]">
                    {editingProjectId ? 'Revise Project Proposal' : 'Student Project Proposal Registration'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {editingProjectId
                      ? 'Revise your project proposal details in accordance with RIC review feedback.'
                      : 'Students use this module to enter a new project proposal and its details.'}
                  </p>
                </div>

                {projectError && (
                  <div role="alert" className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {projectError}
                  </div>
                )}
                {projectSuccess && (
                  <div role="status" className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm">✅ Proposal Registered Successfully!</p>
                      <p className="font-normal mt-0.5">{projectSuccess}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="px-3.5 py-1.5 rounded-lg bg-[#072b54] text-white font-bold text-xs hover:bg-[#0a3666]"
                    >
                      View in Dashboard →
                    </button>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* SECTION 1: ACADEMIC DETAILS & GUIDE TEACHER                   */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="w-6 h-6 rounded-full bg-[#072b54] text-white flex items-center justify-center text-xs font-bold">1</span>
                    <h4 className="font-collegiate text-sm font-bold text-[#072b54]">
                      Academic Details & Guide Teacher
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Project Title *
                    </label>
                    <input
                      required
                      maxLength={200}
                      placeholder="e.g. Automated Threat Hunting & Zero-Day Malware Triage via Deep Neural Telemetry"
                      value={projectForm.title}
                      onChange={(e) => updateProjectField('title', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!editingProjectId && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Department *
                        </label>
                        {currentUser && currentUser.role === 'student' ? (
                          <div className="px-3.5 py-2.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-[#072b54]">
                              <span>🏢</span> {projectForm.department || currentUser.department || 'Department of Computer Applications'}
                            </span>
                            <span className="text-[10px] bg-[#072b54]/10 text-[#072b54] px-2 py-0.5 rounded font-bold uppercase">
                              Enrolled (1 Dept Only)
                            </span>
                          </div>
                        ) : (
                          <select
                            required
                            value={projectForm.department_id}
                            onChange={(e) => updateProjectDepartment(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                          >
                            <option value="">Select Department</option>
                            {departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}{department.code ? ` (${department.code})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Academic Programme / Master Course *
                      </label>
                      {courses.filter((c) => !projectForm.department_id || c.department_id === projectForm.department_id).length > 0 ? (
                        <select
                          required
                          value={projectForm.course || projectForm.programme}
                          onChange={(e) => {
                            const selectedCourse = courses.find((c) => c.name === e.target.value);
                            setProjectForm({
                              ...projectForm,
                              course: e.target.value,
                              course_id: selectedCourse ? selectedCourse.id : '',
                              programme: e.target.value
                            });
                          }}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        >
                          <option value="">Select Official Academic Course</option>
                          {courses
                            .filter((c) => !projectForm.department_id || c.department_id === projectForm.department_id)
                            .map((c) => (
                              <option key={c.id} value={c.name}>
                                [{c.level}] {c.name} {c.code ? `(${c.code})` : ''}
                              </option>
                            ))}
                        </select>
                      ) : availableProgrammes.length > 0 ? (
                        <select
                          required
                          value={projectForm.programme}
                          onChange={(e) => updateProjectField('programme', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        >
                          <option value="">Select Programme / Specialization</option>
                          {availableProgrammes.map((prog, idx) => (
                            <option key={idx} value={prog}>{prog}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          required
                          placeholder="e.g. Bachelor in Computer Applications (BCA Honours)"
                          value={projectForm.programme}
                          onChange={(e) => updateProjectField('programme', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        />
                      )}
                    </div>

                    {!editingProjectId && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Guide Teacher (Faculty Mentor) *
                          </label>
                          <span className="text-[10px] text-slate-500 font-medium">
                            RIC Capacity: 12–15 students max
                          </span>
                        </div>
                        <select
                          required
                          value={projectForm.lead_faculty_id}
                          onChange={(e) => {
                            const lead = guides.find((person) => person.id === e.target.value) || projectFaculty.find((person) => person.id === e.target.value);
                            setProjectForm({
                              ...projectForm,
                              lead_faculty_id: e.target.value,
                              guide_id: e.target.value,
                              lead_investigator: lead ? lead.name : '',
                              guide_name: lead ? lead.name : '',
                              guide_teacher: lead ? `${lead.name} (${lead.designation})` : '',
                              team_member_ids: projectForm.team_member_ids.filter((id) => id !== e.target.value)
                            });
                          }}
                          disabled={!projectFaculty.length}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        >
                          <option value="">
                            {projectFaculty.length ? 'Select Guide Teacher' : 'Select a department first'}
                          </option>
                          {projectFaculty.map((person) => {
                            const guideInfo = guides.find((g) => g.id === person.id) || person;
                            const count = guideInfo.allocated_student_count || 0;
                            const cap = guideInfo.guide_capacity || 15;
                            const isFull = count >= cap;
                            return (
                              <option key={person.id} value={person.id} disabled={isFull && !isInstitutionManager(currentUser)}>
                                {person.name} — {person.designation} {isFull ? `[FULL: ${count}/${cap} Allocated]` : `[${count}/${cap} Allocated — ${cap - count} slots available]`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Register Number (Official University Roll No.) *
                      </label>
                      <input
                        required
                        placeholder="e.g. BVM2026MCA014"
                        value={projectForm.register_number || (currentUser && currentUser.register_number) || ''}
                        onChange={(e) => updateProjectField('register_number', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Academic Year *
                      </label>
                      <select
                        required
                        value={projectForm.academic_year || '2026-27'}
                        onChange={(e) => updateProjectField('academic_year', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                      >
                        <option value="2026-27">2026-27 (Current Academic Year)</option>
                        <option value="2025-26">2025-26 (Prior Academic Year)</option>
                        <option value="2024-25">2024-25 (Institutional Repository Archive)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Student Researcher (Principal Submitter)
                      </label>
                      <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
                        <span><strong>{currentUser.name}</strong></span>
                        <span className="text-[10px] uppercase font-bold text-slate-500">{currentUser.role === 'student' ? 'Student' : currentUser.designation}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Student Co-Investigators / Team Members (Optional)
                      </label>
                      <input
                        placeholder="e.g. Nidhin Paul, Anju Varghese (comma separated)"
                        value={projectForm.student_team_members}
                        onChange={(e) => updateProjectField('student_team_members', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Project Category *
                        </label>
                        <select
                          required
                          value={projectForm.category}
                          onChange={(e) => updateProjectField('category', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        >
                          {['Research', 'Innovation', 'Development', 'Product Development', 'Interdisciplinary', 'Patent/IP', 'Community/Social'].map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Duration (Months) *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="120"
                          value={projectForm.duration_months}
                          onChange={(e) => updateProjectField('duration_months', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* SECTION 2: PROPOSAL CORE & PROBLEM STATEMENT                  */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="w-6 h-6 rounded-full bg-[#072b54] text-white flex items-center justify-center text-xs font-bold">2</span>
                    <h4 className="font-collegiate text-sm font-bold text-[#072b54]">
                      Research Proposal Core & Problem Statement
                    </h4>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Project Abstract *
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">Max 5,000 characters</span>
                    </div>
                    <textarea
                      required
                      maxLength={5000}
                      rows={4}
                      placeholder="Comprehensive academic abstract summarizing the proposed research, scope, and anticipated significance..."
                      value={projectForm.abstract}
                      onChange={(e) => updateProjectField('abstract', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Problem Statement *
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">Max 5,000 characters</span>
                    </div>
                    <textarea
                      required
                      maxLength={5000}
                      rows={3}
                      placeholder="Clearly define the specific real-world problem, research challenge, or industry gap this project addresses..."
                      value={projectForm.problem_statement}
                      onChange={(e) => updateProjectField('problem_statement', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Objectives *
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">Max 5,000 characters</span>
                    </div>
                    <textarea
                      required
                      maxLength={5000}
                      rows={3}
                      placeholder="Enumerate the primary and secondary research aims, targets, and expected milestones (e.g., 1., 2., 3.)..."
                      value={projectForm.objectives}
                      onChange={(e) => updateProjectField('objectives', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* SECTION 3: METHODOLOGY, INNOVATION & EXPECTED RESULTS         */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="w-6 h-6 rounded-full bg-[#072b54] text-white flex items-center justify-center text-xs font-bold">3</span>
                    <h4 className="font-collegiate text-sm font-bold text-[#072b54]">
                      Methodology, Innovation & Expected Results
                    </h4>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Methodology *
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">Max 5,000 characters</span>
                    </div>
                    <textarea
                      required
                      maxLength={5000}
                      rows={3}
                      placeholder="Detail the research methods, experimental procedures, architectural design, algorithms, datasets, and execution plan..."
                      value={projectForm.methodology}
                      onChange={(e) => updateProjectField('methodology', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Keywords *
                    </label>
                    <input
                      required
                      maxLength={500}
                      placeholder="e.g. Cyber Forensics, Neural Telemetry, Zero-Day, eBPF, Edge AI, Kerala (comma-separated)"
                      value={projectForm.keywords}
                      onChange={(e) => updateProjectField('keywords', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Innovation & Technical Novelty *
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">Max 5,000 characters</span>
                    </div>
                    <textarea
                      required
                      maxLength={5000}
                      rows={3}
                      placeholder="Highlight what makes this proposal novel: technical breakthroughs, new algorithms, unique local societal impact..."
                      value={projectForm.innovation}
                      onChange={(e) => updateProjectField('innovation', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Expected Results & Outcomes *
                      </label>
                      <span className="text-[11px] text-slate-400 font-normal">Max 5,000 characters</span>
                    </div>
                    <textarea
                      required
                      maxLength={5000}
                      rows={3}
                      placeholder="Detail the expected tangible deliverables, software prototypes, research papers, patents, or measurable outcomes..."
                      value={projectForm.expected_results}
                      onChange={(e) => {
                        const value = e.target.value;
                        setProjectForm({
                          ...projectForm,
                          expected_results: value,
                          expected_outcomes: value
                        });
                        setSimilarityMatches([]);
                        setSimilarityChecked(false);
                        setSimilarityNotice('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* ADVISORY SIMILARITY SCREENING                                 */}
                {/* ------------------------------------------------------------- */}
                <div className="pt-2">
                  {similarityChecked && similarityMatches.length === 0 && (
                    <div role="status" className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <span>✅</span>
                      <span>No duplicate project matches found in this department. Proposal text is original.</span>
                    </div>
                  )}

                  {similarityNotice && (
                    <p role="status" className="text-xs text-slate-600">{similarityNotice}</p>
                  )}

                  {similarityMatches.length > 0 && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-2">
                      <p className="font-bold text-amber-900 flex items-center gap-2">
                        <span>⚠️</span> Most similar stored projects
                      </p>
                      <p className="text-amber-800">
                        Titles, abstracts, objectives, methods, keywords, and expected results were compared with projects already stored. This supports RIC review and does not reject the proposal.
                      </p>
                      {similarityMatches.map((match) => (
                        <div key={match.project_code} className="p-2 rounded bg-white/70 border border-amber-200 text-amber-900 space-y-1">
                          <div className="flex flex-wrap justify-between gap-2">
                            <span>
                              <strong>{match.project_code}</strong> — {match.title}
                              <small className="block text-amber-700">
                                {match.department || 'Department not recorded'}
                                {match.status ? ` · ${match.status}` : ''}
                                {match.guide_teacher || match.lead_investigator ? ` · ${match.guide_teacher || match.lead_investigator}` : ''}
                              </small>
                              <small className="block text-amber-700">{match.match_cue}</small>
                            </span>
                            <strong className="text-amber-800">{match.score}% match</strong>
                          </div>
                          {match.breakdown && (
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[10px] text-center">
                              <span className="p-1 bg-white rounded border border-amber-100">Title {match.breakdown.titles ?? '—'}%</span>
                              <span className="p-1 bg-white rounded border border-amber-100">Abstract {match.breakdown.abstracts ?? '—'}%</span>
                              <span className="p-1 bg-white rounded border border-amber-100">Objectives {match.breakdown.objectives ?? '—'}%</span>
                              <span className="p-1 bg-white rounded border border-amber-100">Methods {match.breakdown.methods ?? '—'}%</span>
                              <span className="p-1 bg-white rounded border border-amber-100">Keywords {match.breakdown.keywords ?? '—'}%</span>
                              <span className="p-1 bg-white rounded border border-amber-100">Results {match.breakdown.expected_results ?? '—'}%</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!similarityChecked && similarityLoading === false && projectSuccess === '' && (
                    <p className="text-xs text-slate-500">
                      💡 Tip: Click "Check Similarity" to compare this proposal with existing departmental records before final submission.
                    </p>
                  )}
                </div>

                {/* ------------------------------------------------------------- */}
                {/* ACTION BUTTONS                                                */}
                {/* ------------------------------------------------------------- */}
                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-200">
                  {editingProjectId && (
                    <button
                      type="button"
                      onClick={() => openProjectRegistration(null)}
                      className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                    >
                      ✕ Cancel Editing (Start New)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openProjectRegistration(null)}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                  >
                    🔄 Clear Form
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckProjectSimilarity}
                    disabled={similarityLoading || projectSubmitting}
                    className="px-4 py-2.5 rounded-lg border border-[#072b54] text-[#072b54] hover:bg-slate-50 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {similarityLoading ? 'Checking Similarity…' : '🔍 Check Similarity'}
                  </button>
                  <button
                    type="submit"
                    disabled={projectSubmitting}
                    className="px-6 py-2.5 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {projectSubmitting
                      ? 'Saving to Institutional Registry…'
                      : editingProjectId
                        ? '💾 Save Changes & Update Proposal'
                        : '📤 Submit Project Proposal to RIC'}
                  </button>
                </div>
              </form>
            )}

            {/* ================================================================= */}
            {/* AI-BASED PROJECT SIMILARITY CHECKING (RIC MEMBERS ONLY)           */}
            {/* ================================================================= */}
            {activeTab === 'similarity-scan' && isRICMember(currentUser) && (
              <div className="space-y-6">
                <div className="standard-card p-6 sm:p-8 bg-white border-slate-200 space-y-4">
                  <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                        <span>🏛️ BVM Holy Cross College, Cherpunkal</span>
                        <span>•</span>
                        <span>Research & Innovation Cell (RIC)</span>
                      </div>
                      <h3 className="font-collegiate text-xl font-bold text-[#072b54] flex items-center gap-2">
                        <span>🤖</span> AI-Based Department Similarity Scanner
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                        This module compares a project proposal with other projects already stored in the system across six distinct dimensions: titles, abstracts, objectives, methods, keywords, and expected results.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#072b54]/10 text-[#072b54] text-xs font-bold font-mono">
                      Threshold: 25% Overlap
                    </span>
                  </div>

                  {/* Mandatory Institutional Policy Notice */}
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
                    <span className="text-lg">⚖️</span>
                    <div>
                      <strong className="block text-blue-950 font-bold mb-0.5">RIC Institutional Policy Standard</strong>
                      <span>AI similarity scanning is utilized strictly as an advisory support aid for human committee review. The system <strong>never rejects a project automatically</strong> based on similarity scores. Final academic decisions remain exclusively with the faculty and Research & Innovation Council (RIC).</span>
                    </div>
                  </div>

                  {scannerError && (
                    <div role="alert" className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {scannerError}
                    </div>
                  )}

                  {/* Preset Selector */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      📂 Quick Test: Load an Existing Proposal from Institutional Repository
                    </label>
                    <select
                      value={selectedPresetCode}
                      onChange={(e) => handleLoadPresetProject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                    >
                      <option value="">-- Choose an existing project to test or fill fields below manually --</option>
                      {dashboardProjectList && dashboardProjectList.map((p) => (
                        <option key={p.project_code} value={p.project_code}>
                          {p.project_code} — {p.title} ({p.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 6-Dimension Input Form */}
                  <form onSubmit={handleRunScanner} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          1. Project Title *
                        </label>
                        <input
                          required
                          placeholder="Enter proposed project title..."
                          value={scannerForm.title}
                          onChange={(e) => setScannerForm({ ...scannerForm, title: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Department
                        </label>
                        {currentUser && currentUser.role === 'student' ? (
                          <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold">
                            {currentUser.department || 'Department of Computer Applications'}
                          </div>
                        ) : (
                          <select
                            value={scannerForm.department_id}
                            onChange={(e) => {
                              const dept = departments.find(d => d.id === e.target.value);
                              setScannerForm({
                                ...scannerForm,
                                department_id: e.target.value,
                                department: dept ? dept.name : ''
                              });
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                          >
                            <option value="">All Departments (Institutional)</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          2. Abstract & Problem Statement *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Paste or enter project abstract and problem formulation..."
                          value={scannerForm.abstract}
                          onChange={(e) => setScannerForm({ ...scannerForm, abstract: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          3. Research Objectives *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Enumerate project objectives (e.g., 1., 2., 3.)..."
                          value={scannerForm.objectives}
                          onChange={(e) => setScannerForm({ ...scannerForm, objectives: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          4. Methods & Technical Methodology *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Detail algorithms, system architecture, dataset, or experimental design..."
                          value={scannerForm.methodology}
                          onChange={(e) => setScannerForm({ ...scannerForm, methodology: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          6. Expected Results & Outcomes *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Anticipated deliverables, accuracy metrics, prototypes, papers..."
                          value={scannerForm.expected_results}
                          onChange={(e) => setScannerForm({ ...scannerForm, expected_results: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        5. Keywords *
                      </label>
                      <input
                        placeholder="Comma-separated keywords (e.g. Neural Networks, Edge TPU, Zero-Day, eBPF)..."
                        value={scannerForm.keywords}
                        onChange={(e) => setScannerForm({ ...scannerForm, keywords: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="font-bold text-slate-700">Comparison Scope:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="scannerScope"
                            checked={scannerForm.scope !== 'all'}
                            onChange={() => setScannerForm({ ...scannerForm, scope: 'department' })}
                          />
                          <span>Same Department Only</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="scannerScope"
                            checked={scannerForm.scope === 'all'}
                            onChange={() => setScannerForm({ ...scannerForm, scope: 'all' })}
                          />
                          <span>All Departments (Campus-Wide)</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setScannerForm({
                              title: '',
                              department: '',
                              department_id: '',
                              scope: 'department',
                              abstract: '',
                              problem_statement: '',
                              objectives: '',
                              methodology: '',
                              keywords: '',
                              expected_results: ''
                            });
                            setScannerResults(null);
                            setSelectedPresetCode('');
                          }}
                          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                        >
                          🔄 Clear Inputs
                        </button>
                        <button
                          type="submit"
                          disabled={scannerLoading}
                          className="px-6 py-2.5 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          {scannerLoading ? 'Running AI 6-D Scan…' : '🚀 Run Multi-Dimensional AI Scan'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Scan Results Presentation */}
                {scannerResults && (
                  <div className="standard-card p-6 sm:p-8 bg-white border-slate-200 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                      <div>
                        <div className="text-[11px] uppercase font-bold text-slate-500">Analysis Complete</div>
                        <h4 className="font-collegiate text-lg font-bold text-[#072b54]">
                          AI Similarity Scan Report & Matching Records
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">Overall Match Level:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                          scannerResults.matches && scannerResults.matches.length && scannerResults.matches[0].score >= 50
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : scannerResults.matches && scannerResults.matches.length && scannerResults.matches[0].score >= 25
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {scannerResults.matches && scannerResults.matches.length
                            ? `${scannerResults.matches[0].score}% Top Match`
                            : '0% (Completely Original)'}
                        </span>
                      </div>
                    </div>

                    {scannerResults.saved && (
                      <p role="status" className="text-xs text-slate-600">
                        This report was saved on the project record so RIC members can refer to it later. The project status is unchanged.
                      </p>
                    )}
                    {scannerResults.policy_notice && (
                      <p className="text-xs text-slate-600">{scannerResults.policy_notice}</p>
                    )}

                    {scannerResults.matches && scannerResults.matches.length > 0 ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 text-xs space-y-2">
                          <p className="font-bold text-amber-950 flex items-center gap-2">
                            <span>🔍</span> Potential Matching Proposals Identified ({scannerResults.matches.length})
                          </p>
                          <p className="text-amber-800">
                            The following projects in the institutional database demonstrate semantic similarities across one or more evaluated dimensions. Review details to verify novelty and avoid duplicate research efforts.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {scannerResults.matches.map((match, idx) => (
                            <div key={match.project_code || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-[#072b54]">{match.project_code}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-xs text-slate-600 font-medium">{match.department}</span>
                                    <span className="text-slate-400">•</span>
                                    {getStatusBadge(match.status)}
                                  </div>
                                  <h5 className="font-bold text-sm text-slate-900 mt-1">{match.title}</h5>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Guide Teacher / PI: <strong>{match.guide_teacher || match.lead_investigator || 'Not recorded'}</strong>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-lg font-black text-[#072b54]">{match.score}%</div>
                                  <div className="text-[10px] text-slate-500 uppercase font-bold">Similarity Index</div>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                                <strong>Match Cue:</strong> <span className="capitalize">{match.match_cue || 'Semantic overlap detected'}</span>
                              </div>

                              {match.breakdown && (
                                <div className="space-y-1">
                                  <div className="text-[11px] font-bold text-slate-600">6-Dimension Similarity Breakdown:</div>
                                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                                    <div className="p-2 rounded bg-white border border-slate-200">
                                      <div className="text-[10px] text-slate-400 font-bold uppercase">1. Title</div>
                                      <div className="font-bold text-[#072b54] text-sm mt-0.5">{match.breakdown.titles ?? '—'}%</div>
                                    </div>
                                    <div className="p-2 rounded bg-white border border-slate-200">
                                      <div className="text-[10px] text-slate-400 font-bold uppercase">2. Abstract</div>
                                      <div className="font-bold text-[#072b54] text-sm mt-0.5">{match.breakdown.abstracts ?? '—'}%</div>
                                    </div>
                                    <div className="p-2 rounded bg-white border border-slate-200">
                                      <div className="text-[10px] text-slate-400 font-bold uppercase">3. Objectives</div>
                                      <div className="font-bold text-[#072b54] text-sm mt-0.5">{match.breakdown.objectives ?? '—'}%</div>
                                    </div>
                                    <div className="p-2 rounded bg-white border border-slate-200">
                                      <div className="text-[10px] text-slate-400 font-bold uppercase">4. Methods</div>
                                      <div className="font-bold text-[#072b54] text-sm mt-0.5">{match.breakdown.methods ?? '—'}%</div>
                                    </div>
                                    <div className="p-2 rounded bg-white border border-slate-200">
                                      <div className="text-[10px] text-slate-400 font-bold uppercase">5. Keywords</div>
                                      <div className="font-bold text-[#072b54] text-sm mt-0.5">{match.breakdown.keywords ?? '—'}%</div>
                                    </div>
                                    <div className="p-2 rounded bg-white border border-slate-200">
                                      <div className="text-[10px] text-slate-400 font-bold uppercase">6. Results</div>
                                      <div className="font-bold text-[#072b54] text-sm mt-0.5">{match.breakdown.expected_results ?? '—'}%</div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {match.common_terms && match.common_terms.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                                  <span className="font-bold text-slate-600">Shared Domain Vocabulary:</span>
                                  {match.common_terms.map((t) => (
                                    <span key={t} className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono text-[11px]">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 text-xl font-bold flex items-center justify-center mx-auto">
                          ✅
                        </div>
                        <h4 className="font-collegiate text-base font-bold text-emerald-950">
                          No Significant Similarities Found
                        </h4>
                        <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                          This proposal exhibits strong originality and distinct research formulation across all 6 examined dimensions compared against institutional records.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB: MODULE 6: PROJECT REVIEW & EVALUATION                        */}
            {/* ================================================================= */}
            {activeTab === 'review-evaluation' && isRICMember(currentUser) && (() => {
              const list = dashboardProjectList || [];
              const myId = currentUser?.id || currentUser?._id;

              // Filter by tab
              let filtered = list;
              if (module6Filter === 'assigned_to_me') {
                filtered = filtered.filter(p => Array.isArray(p.assigned_reviewers) && p.assigned_reviewers.some(r => r.user_id === myId));
              } else if (module6Filter === 'pending') {
                filtered = filtered.filter(p => !Array.isArray(p.evaluations) || p.evaluations.length === 0);
              } else if (module6Filter === 'evaluated') {
                filtered = filtered.filter(p => Array.isArray(p.evaluations) && p.evaluations.length > 0);
              }

              // Filter by search
              if (module6Search.trim()) {
                const q = module6Search.toLowerCase().trim();
                filtered = filtered.filter(p =>
                  (p.title && p.title.toLowerCase().includes(q)) ||
                  (p.project_code && p.project_code.toLowerCase().includes(q)) ||
                  (p.department && p.department.toLowerCase().includes(q)) ||
                  (p.lead_investigator && p.lead_investigator.toLowerCase().includes(q)) ||
                  (p.submitted_by_name && p.submitted_by_name.toLowerCase().includes(q)) ||
                  (p.guide_teacher && p.guide_teacher.toLowerCase().includes(q))
                );
              }

              // Filter by department
              if (module6DepartmentFilter !== 'all') {
                filtered = filtered.filter(p => p.department === module6DepartmentFilter);
              }

              const assignedCount = list.filter(p => Array.isArray(p.assigned_reviewers) && p.assigned_reviewers.length > 0).length;
              const evaluatedCount = list.filter(p => Array.isArray(p.evaluations) && p.evaluations.length > 0).length;
              const pendingCount = list.filter(p => p.status === 'pending').length;

              return (
                <div className="space-y-6">
                  {/* Institutional Header Banner */}
                  <div className="standard-card p-6 bg-white border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⚖️</span>
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#072b54]/10 text-[#072b54]">
                            Research & Innovation Cell (RIC)
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">• Academic Quality & Review Directorate</span>
                        </div>
                        <h2 className="font-collegiate text-xl sm:text-2xl font-bold text-[#072b54] mt-1.5">
                          RIC Committee Review & Evaluation
                        </h2>
                        <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                          Examine proposal quality and institutional value. Assign proposals to authorized RIC reviewers,
                          score submissions using the fixed 5-dimension rubric (Novelty, Methodology, Feasibility, Impact, Clarity),
                          record recommendations, and preserve permanent evaluation records for council governance.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fetchDashboard(false)}
                          className="px-3.5 py-2 text-xs font-bold text-[#072b54] bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <span>🔄</span> Refresh Proposals
                        </button>
                      </div>
                    </div>

                    {/* Metric Overview Counters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100">
                      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Proposals</span>
                        <span className="font-collegiate text-2xl font-bold text-[#072b54] mt-0.5 block">
                          {list.length}
                        </span>
                      </div>
                      <div className="p-3.5 bg-blue-50/70 rounded-lg border border-blue-200">
                        <span className="text-[11px] font-semibold text-blue-700 uppercase block">Assigned for Review</span>
                        <span className="font-collegiate text-2xl font-bold text-blue-900 mt-0.5 block">
                          {assignedCount}
                        </span>
                      </div>
                      <div className="p-3.5 bg-emerald-50/70 rounded-lg border border-emerald-200">
                        <span className="text-[11px] font-semibold text-emerald-700 uppercase block">Evaluations Completed</span>
                        <span className="font-collegiate text-2xl font-bold text-emerald-900 mt-0.5 block">
                          {evaluatedCount}
                        </span>
                      </div>
                      <div className="p-3.5 bg-amber-50/70 rounded-lg border border-amber-200">
                        <span className="text-[11px] font-semibold text-amber-700 uppercase block">Awaiting Council Decision</span>
                        <span className="font-collegiate text-2xl font-bold text-amber-900 mt-0.5 block">
                          {pendingCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs & Search Bar */}
                  <div className="standard-card p-4 bg-white border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setModule6Filter('all')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          module6Filter === 'all'
                            ? 'bg-[#072b54] text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        All Proposals ({list.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModule6Filter('assigned_to_me')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          module6Filter === 'assigned_to_me'
                            ? 'bg-[#072b54] text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Assigned to Me ({list.filter(p => Array.isArray(p.assigned_reviewers) && p.assigned_reviewers.some(r => r.user_id === myId)).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModule6Filter('pending')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          module6Filter === 'pending'
                            ? 'bg-[#072b54] text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Awaiting Evaluation ({list.filter(p => !Array.isArray(p.evaluations) || p.evaluations.length === 0).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModule6Filter('evaluated')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          module6Filter === 'evaluated'
                            ? 'bg-[#072b54] text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Evaluated Proposals ({evaluatedCount})
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <select
                        value={module6DepartmentFilter}
                        onChange={(e) => setModule6DepartmentFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border-2 border-blue-400 bg-blue-50/70 font-bold text-[#072b54] focus:outline-none focus:ring-2 focus:ring-[#072b54] cursor-pointer"
                        title="Filter proposals by academic department"
                      >
                        <option value="all">🏢 All Academic Departments ({OFFICIAL_INSTITUTIONAL_DEPARTMENTS.length})</option>
                        {OFFICIAL_INSTITUTIONAL_DEPARTMENTS.map((dept) => {
                          const count = list.filter(p => p.department === dept).length;
                          const pending = list.filter(p => p.department === dept && (!Array.isArray(p.evaluations) || p.evaluations.length === 0)).length;
                          return (
                            <option key={dept} value={dept}>
                              {dept} ({count} proposal{count === 1 ? '' : 's'}{pending > 0 ? ` • ${pending} awaiting review` : ''})
                            </option>
                          );
                        })}
                      </select>

                      <div className="w-full sm:w-64">
                        <input
                          type="text"
                          placeholder="Search code, title, student..."
                          value={module6Search}
                          onChange={(e) => setModule6Search(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Department-Wise Navigation Pill Strip */}
                  <div className="standard-card p-3.5 bg-gradient-to-r from-slate-50 via-blue-50/30 to-amber-50/20 border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#072b54] flex items-center gap-1.5">
                        <span>🏛️</span> Department-Wise Portfolio (BVM Holy Cross College, Cherpunkal)
                      </span>
                      {module6DepartmentFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setModule6DepartmentFilter('all')}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                        >
                          ✕ Show All Departments
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setModule6DepartmentFilter('all')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          module6DepartmentFilter === 'all'
                            ? 'bg-[#072b54] text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <span>🏢 All Departments</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          module6DepartmentFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {list.length}
                        </span>
                      </button>
                      {OFFICIAL_INSTITUTIONAL_DEPARTMENTS.map((dept) => {
                        const deptCount = list.filter(p => p.department === dept).length;
                        const deptPending = list.filter(p => p.department === dept && (!Array.isArray(p.evaluations) || p.evaluations.length === 0)).length;
                        const isSelected = module6DepartmentFilter === dept;
                        const shortName = dept.replace('Department of ', '');
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => setModule6DepartmentFilter(isSelected ? 'all' : dept)}
                            className={`px-2.5 py-1 rounded-full text-xs transition cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[#072b54] text-white shadow-xs font-bold'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-medium'
                            }`}
                            title={dept}
                          >
                            <span>{shortName}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : deptPending > 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {deptCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Proposals List */}
                  {filtered.length === 0 ? (
                    <div className="standard-card p-12 text-center bg-white border-slate-200 space-y-2">
                      <span className="text-3xl block">📁</span>
                      <h4 className="font-collegiate font-bold text-slate-800 text-sm">
                        No Proposals in {module6DepartmentFilter === 'all' ? 'Selected Category' : module6DepartmentFilter}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {module6DepartmentFilter !== 'all'
                          ? `No proposals matching the current status filter were found for ${module6DepartmentFilter}. Click "All Proposals" or reset the department filter to inspect other records.`
                          : 'There are no registered research proposals in this category. Adjust the filter or check back after new proposals are submitted.'}
                      </p>
                      {module6DepartmentFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setModule6DepartmentFilter('all')}
                          className="px-3.5 py-1.5 bg-[#072b54] text-white text-xs font-bold rounded-lg mt-2 cursor-pointer"
                        >
                          Show All Departments
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((proj) => {
                        const assigned = Array.isArray(proj.assigned_reviewers) ? proj.assigned_reviewers : [];
                        const evaluations = Array.isArray(proj.evaluations) ? proj.evaluations : [];
                        const summary = proj.evaluation_summary || { total_evaluations: evaluations.length, average_score: 0, consensus_recommendation: 'Awaiting Evaluation' };
                        const isAssignedToMe = assigned.some((r) => r.user_id === myId);
                        const myEvaluation = evaluations.find((ev) => ev.reviewer_id === myId);
                        const canEvaluate = isAssignedToMe || isRICHead(currentUser);

                        return (
                          <div
                            key={proj._id || proj.project_code}
                            className="standard-card p-5 bg-white border border-slate-200 hover:border-indigo-300 transition shadow-2xs space-y-4"
                          >
                            {/* Top Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#072b54] bg-[#072b54]/10 px-2.5 py-0.5 rounded">
                                  {proj.project_code}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {proj.category}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {proj.department}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  proj.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  proj.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                  proj.status === 'ongoing' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                  proj.status === 'completed' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                                  proj.status === 'changes_requested' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                  'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {proj.status === 'pending' ? 'Pending RIC Evaluation' :
                                   proj.status === 'approved' ? 'Council Approved' :
                                   proj.status === 'ongoing' ? 'Active Progress' :
                                   proj.status === 'completed' ? 'Completed' :
                                   proj.status === 'changes_requested' ? 'Changes Requested' : 'Rejected'}
                                </span>
                                {proj.panel_interview && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                    <span>🎙️</span> Viva Cleared ({proj.panel_interview.total_score}/100)
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-400">
                                Submitted: {formatProjectDate(proj.submitted_date || proj.createdAt)}
                              </div>
                            </div>

                            {/* Title & Metadata */}
                            <div className="space-y-1.5">
                              <h3 className="font-collegiate text-base font-bold text-[#072b54]">
                                {proj.title}
                              </h3>
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {proj.abstract || 'No abstract text recorded.'}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-600">
                                <div>
                                  <strong className="text-slate-800">Student Researcher:</strong> {proj.lead_investigator || proj.submitted_by_name || 'N/A'}
                                </div>
                                {proj.guide_teacher && (
                                  <div>
                                    <strong className="text-slate-800">Guide Teacher:</strong> {proj.guide_teacher}
                                  </div>
                                )}
                                {proj.programme && (
                                  <div>
                                    <strong className="text-slate-800">Programme:</strong> {proj.programme}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Two-Column Reviewer & Evaluation Insights */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {/* Reviewers Box */}
                              <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                                    <span>👥</span> Assigned Committee Reviewers ({assigned.length})
                                  </span>
                                  {isRICHead(currentUser) && (
                                    <button
                                      type="button"
                                      onClick={() => openAssignModal(proj)}
                                      className="text-[11px] font-bold text-[#072b54] hover:underline cursor-pointer"
                                    >
                                      Assign / Edit
                                    </button>
                                  )}
                                </div>

                                {assigned.length === 0 ? (
                                  <div className="text-[11px] text-slate-400 italic">
                                    No reviewers assigned yet. {isRICHead(currentUser) ? 'Click "Assign / Edit" to designate RIC evaluators.' : 'Awaiting RIC Head assignment.'}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {assigned.map((r) => {
                                      const hasSubmitted = evaluations.some((ev) => ev.reviewer_id === r.user_id);
                                      const isMe = r.user_id === myId;
                                      return (
                                        <span
                                          key={r.user_id}
                                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                                            hasSubmitted
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                              : 'bg-white text-slate-700 border-slate-300'
                                          }`}
                                        >
                                          <span>{hasSubmitted ? '✅' : '⏳'}</span>
                                          <span>{r.name}</span>
                                          {isMe && <span className="text-[10px] bg-amber-100 text-amber-900 px-1 rounded font-bold">You</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Evaluation Summary Box */}
                              <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                                    <span>📝</span> Evaluation Record ({evaluations.length} Submitted)
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    (proj.similarity_score || 0) >= 25 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    🤖 {proj.similarity_score || 0}% AI Overlap
                                  </span>
                                </div>

                                {evaluations.length === 0 ? (
                                  <div className="text-[11px] text-slate-400 italic">
                                    Awaiting committee evaluation submission against the 5 fixed criteria.
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-500 text-[11px]">Average Score:</span>
                                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                        summary.average_score >= 75 ? 'bg-emerald-100 text-emerald-800' :
                                        summary.average_score >= 50 ? 'bg-amber-100 text-amber-800' :
                                        'bg-rose-100 text-rose-800'
                                      }`}>
                                        {summary.average_score} / 100
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-500 text-[11px]">Consensus:</span>
                                      <span className={`font-bold text-xs px-2 py-0.5 rounded ${
                                        summary.consensus_recommendation === 'Approve' ? 'bg-emerald-100 text-emerald-800' :
                                        summary.consensus_recommendation === 'Revision Required' ? 'bg-amber-100 text-amber-800' :
                                        'bg-rose-100 text-rose-800'
                                      }`}>
                                        {summary.consensus_recommendation}
                                      </span>
                                    </div>
                                    {myEvaluation && (
                                      <div className="text-[11px] text-slate-500">
                                        (Your Score: <strong className="text-slate-800">{myEvaluation.total_score}/100</strong> - {myEvaluation.recommendation})
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                {isAssignedToMe && (
                                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                                    <span>⭐</span> You are assigned to evaluate this proposal
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {isRICHead(currentUser) && (
                                  <button
                                    type="button"
                                    onClick={() => openAssignModal(proj)}
                                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                                  >
                                    <span>👥</span> Assign Reviewers
                                  </button>
                                )}

                                {canEvaluate && (
                                  <button
                                    type="button"
                                    onClick={() => openEvaluationModal(proj)}
                                    className={`px-4 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                      myEvaluation
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                        : 'bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-400/40'
                                    }`}
                                  >
                                    <span>📝</span> {myEvaluation ? 'Update My Evaluation' : 'Evaluate Proposal'}
                                  </button>
                                )}

                                {isRICMember(currentUser) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPanelInterview(proj)}
                                    className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs ring-2 ring-emerald-500/30"
                                  >
                                    <span>🎙️</span> {proj.panel_interview ? 'View / Update Panel Viva' : 'Panel Interview & Approve'}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openProjectDossier(proj)}
                                  className="px-4 py-1.5 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>👁️</span> View Dossier & Evaluations
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            
            {/* =================================================================== */}
            {/* MODULE 8: PROJECT GUIDE REVIEW & MENTORSHIP VIEW                    */}
            {/* =================================================================== */}
            {activeTab === 'guide-review' && (
              <section className="standard-card p-6 sm:p-8 bg-white border-slate-200 space-y-6">
                <header className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                      <span>🏛️ BVM Holy Cross College, Cherpunkal</span>
                      <span>•</span>
                      <span>Faculty Mentorship Continuum</span>
                    </div>
                    <h2 className="font-collegiate text-xl font-bold text-[#072b54]">
                      Project Guide Review & Mentorship Dashboard
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Review proposals submitted by your assigned students. Examine abstracts, methodology, and deliverables, provide academic revision directives, or formally recommend proposals for RIC Council evaluation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchGuideProposals}
                    disabled={guideProposalsLoading}
                    className="px-4 py-2 bg-[#072b54] hover:bg-[#0a3666] text-white font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🔄</span> {guideProposalsLoading ? 'Refreshing…' : 'Refresh Proposals'}
                  </button>
                </header>

                {/* Guide Mentorship Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Assigned Proposals</span>
                    <strong className="text-xl font-collegiate text-[#072b54]">{guideProposals.length}</strong>
                  </div>
                  <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">Awaiting Guide Review</span>
                    <strong className="text-xl font-collegiate text-amber-900">
                      {guideProposals.filter((p) => !p.guide_review || !p.guide_review.status || p.guide_review.status === 'pending').length}
                    </strong>
                  </div>
                  <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Recommended for RIC</span>
                    <strong className="text-xl font-collegiate text-emerald-900">
                      {guideProposals.filter((p) => p.guide_review && p.guide_review.status === 'recommended').length}
                    </strong>
                  </div>
                  <div className="p-3.5 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-[10px] uppercase font-bold text-orange-800 block">Revisions Requested</span>
                    <strong className="text-xl font-collegiate text-orange-900">
                      {guideProposals.filter((p) => p.guide_review && p.guide_review.status === 'revision_required').length}
                    </strong>
                  </div>
                </div>

                {/* Proposals List */}
                {guideProposalsLoading ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Loading assigned student proposals…
                  </div>
                ) : guideProposals.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-2">
                    <span className="text-3xl block">📚</span>
                    <strong className="text-sm text-[#072b54] block font-collegiate">No Proposals Currently Assigned</strong>
                    <p className="max-w-md mx-auto text-slate-500 text-xs">
                      Proposals submitted by students assigned to your guidance will appear here automatically for review and academic evaluation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {guideProposals.map((proj) => {
                      const reviewStatus = proj.guide_review ? proj.guide_review.status : 'pending';
                      return (
                        <div key={proj._id || proj.project_code} className="p-5 rounded-xl border border-slate-200 bg-white hover:border-[#072b54]/40 transition shadow-2xs space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#072b54] bg-[#072b54]/10 px-2.5 py-0.5 rounded">
                                {proj.project_code}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {proj.academic_year || '2026-27'}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                {proj.category}
                              </span>
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                reviewStatus === 'recommended' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                reviewStatus === 'revision_required' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}>
                                {reviewStatus === 'recommended' ? '✅ Recommended for RIC' :
                                 reviewStatus === 'revision_required' ? '↩️ Student Revision Requested' :
                                 '⏳ Awaiting Guide Review'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Submitted: {formatProjectDate(proj.submitted_date || proj.createdAt)}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-collegiate font-bold text-base text-[#072b54]">
                              {proj.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                              <span><strong>Student:</strong> {proj.lead_investigator || proj.submitted_by_name}</span>
                              {proj.register_number && <span><strong>Reg No:</strong> {proj.register_number}</span>}
                              <span><strong>Department:</strong> {proj.department}</span>
                              {proj.course && <span><strong>Course:</strong> {proj.course}</span>}
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 line-clamp-2">
                            <strong>Abstract: </strong>{proj.abstract}
                          </div>

                          {proj.guide_review && proj.guide_review.comments && (
                            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-slate-800">
                              <span className="font-bold text-blue-900 block text-[11px] uppercase mb-0.5">Your Recorded Guide Feedback:</span>
                              <p className="whitespace-pre-line">{proj.guide_review.comments}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => viewProjectDetails(proj)}
                              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
                            >
                              👁️ View Full Proposal Dossier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenGuideReview(proj)}
                              className="px-4 py-1.5 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white font-bold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                            >
                              <span>📝</span> {proj.guide_review && proj.guide_review.status ? 'Update Review' : 'Review & Submit Recommendation'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'institution' && isInstitutionManager(currentUser) && (
              <section className="institution-view standard-card">
                <header className="institution-heading">
                  <div>
                    <p className="institution-eyebrow">Institutional directory</p>
                    <h1 className="font-collegiate">Departments & permitted faculty</h1>
                    <p>Maintain the department and faculty lists used for new project registrations.</p>
                  </div>
                  <button type="button" className="institution-refresh" onClick={fetchInstitutionData} disabled={institutionLoading}>
                    {institutionLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </header>

                {institutionError && <p className="institution-alert" role="alert">{institutionError}</p>}
                {institutionNotice && <p className="institution-notice" role="status">{institutionNotice}</p>}

                <div className="institution-main-grid">
                  <div className="institution-column">
                    <form className="institution-form" onSubmit={handleSaveDepartment}>
                      <div className="institution-section-heading">
                        <div>
                          <h2>{editingDepartmentId ? 'Edit department' : 'Add department'}</h2>
                          <p>Department codes are optional; leave blank until one is supplied by the institution.</p>
                        </div>
                      </div>
                      <div className="institution-form-fields">
                        <label>
                          Department name
                          <input
                            required
                            maxLength={120}
                            value={departmentForm.name}
                            onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })}
                            placeholder="e.g. Computer Applications"
                          />
                        </label>
                        <label>
                          Code <span>(optional)</span>
                          <input
                            maxLength={20}
                            value={departmentForm.code}
                            onChange={(event) => setDepartmentForm({ ...departmentForm, code: event.target.value.toUpperCase() })}
                            placeholder="No code supplied"
                          />
                        </label>
                      </div>
                      <div className="institution-form-actions">
                        {editingDepartmentId && (
                          <button type="button" className="institution-secondary-button" onClick={cancelDepartmentEdit}>
                            Cancel
                          </button>
                        )}
                        <button type="submit" className="institution-primary-button" disabled={institutionSaving}>
                          {institutionSaving ? 'Saving…' : editingDepartmentId ? 'Save department' : 'Add department'}
                        </button>
                      </div>
                    </form>

                    <div className="institution-list-section">
                      <div className="institution-section-heading">
                        <div>
                          <h2>Departments</h2>
                          <p>Project totals include only records with an explicit managed department link.</p>
                        </div>
                      </div>
                      {institutionLoading && !departments.length ? (
                        <div className="institution-empty">Loading department records…</div>
                      ) : departments.length ? (
                        <div className="institution-table-wrap">
                          <table className="institution-table">
                            <thead>
                              <tr><th>Department</th><th>Projects</th><th>Faculty</th><th>Status counts</th><th></th></tr>
                            </thead>
                            <tbody>
                              {departments.map((department) => {
                                const summary = departmentSummary && departmentSummary.departments
                                  ? departmentSummary.departments.find((item) => item.id === department.id)
                                  : null;
                                return (
                                  <tr key={department.id} className={selectedDepartmentId === department.id ? 'is-selected' : ''}>
                                    <td>
                                      <button type="button" className="institution-department-select" onClick={() => {
                                        setSelectedDepartmentId(department.id);
                                        setFacultyForm({ name: '', email: '', designation: '', department_id: department.id });
                                        setEditingFacultyId('');
                                      }}>
                                      <strong>{department.name}</strong>
                                      <span>{department.code || 'Code not supplied'}</span>
                                      {department.programmes && department.programmes.length > 0 && (
                                        <small className="institution-programmes">
                                          {department.programmes.map((programme) =>
                                            `${programme.name}${programme.specializations.length
                                              ? ` — ${programme.specializations.join(', ')}`
                                              : ''}`
                                          ).join(' · ')}
                                        </small>
                                      )}
                                      </button>
                                    </td>
                                    <td>{summary ? summary.total : '—'}</td>
                                    <td>{summary ? summary.faculty_count : faculty.filter((person) => person.department_id === department.id).length}</td>
                                    <td className="institution-status-counts">
                                      {summary
                                        ? `Pending ${summary.statusCounts.pending} · Approved ${summary.statusCounts.approved} · Changes ${summary.statusCounts.changes_requested} · Ongoing ${summary.statusCounts.ongoing} · Done ${summary.statusCounts.completed} · Rejected ${summary.statusCounts.rejected} · Other ${summary.statusCounts.unknown}`
                                        : '—'}
                                    </td>
                                    <td>
                                      <button type="button" className="institution-edit-button" onClick={() => startDepartmentEdit(department)}>
                                        Edit
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="institution-empty">
                          <strong>No departments have been added.</strong>
                          <span>Add the institution’s official departments to enable project registration.</span>
                        </div>
                      )}
                      {departmentSummary && departmentSummary.unlinked && (
                        <p className="institution-legacy-note">
                          {departmentSummary.unlinked.total} legacy or unlinked project{departmentSummary.unlinked.total === 1 ? '' : 's'} remain outside managed department totals. Existing assignments have not been inferred or changed.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="institution-column institution-faculty-column">
                    <div className="institution-section-heading">
                      <div>
                        <h2>{departments.find((item) => item.id === selectedDepartmentId)?.name || 'Permitted faculty'}</h2>
                        <p>Faculty records here are available for project lead and team assignment.</p>
                      </div>
                    </div>
                    {selectedDepartmentId ? (
                      <>
                        <form className="institution-form institution-faculty-form" onSubmit={handleSaveFaculty}>
                          <label>
                            Faculty name
                            <input
                              required
                              maxLength={120}
                              value={facultyForm.name}
                              onChange={(event) => setFacultyForm({ ...facultyForm, name: event.target.value, department_id: selectedDepartmentId })}
                              placeholder="e.g. Dr. Mary Scaria"
                            />
                          </label>
                          <label>
                            Designation
                            <input
                              required
                              maxLength={120}
                              value={facultyForm.designation}
                              onChange={(event) => setFacultyForm({ ...facultyForm, designation: event.target.value, department_id: selectedDepartmentId })}
                              placeholder="e.g. Associate Professor"
                            />
                          </label>
                          <label>
                            Email address <span>(optional)</span>
                            <input
                              type="email"
                              maxLength={254}
                              value={facultyForm.email}
                              onChange={(event) => setFacultyForm({ ...facultyForm, email: event.target.value, department_id: selectedDepartmentId })}
                              placeholder="faculty@gmail.com"
                            />
                          </label>
                          <div className="institution-form-actions">
                            {editingFacultyId && (
                              <button type="button" className="institution-secondary-button" onClick={cancelFacultyEdit}>
                                Cancel
                              </button>
                            )}
                            <button type="submit" className="institution-primary-button" disabled={institutionSaving}>
                              {institutionSaving ? 'Saving…' : editingFacultyId ? 'Save faculty' : 'Add faculty'}
                            </button>
                          </div>
                        </form>
                        {faculty.filter((person) => person.department_id === selectedDepartmentId).length ? (
                          <ul className="institution-faculty-list">
                            {faculty.filter((person) => person.department_id === selectedDepartmentId).map((person) => (
                              <li key={person.id}>
                                <span><strong>{person.name}</strong><small>{person.designation}{person.email ? ` · ${person.email}` : ''}</small></span>
                                <button type="button" className="institution-edit-button" onClick={() => startFacultyEdit(person)}>Edit</button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="institution-empty">No permitted faculty have been added to this department.</div>
                        )}
                      </>
                    ) : (
                      <div className="institution-empty">Add or select a department before managing its faculty.</div>
                    )}
                  </div>
                </div>
                {unassignedProgrammes.length > 0 && (
                  <section className="institution-unassigned" aria-labelledby="institution-unassigned-title">
                    <h2 id="institution-unassigned-title">Unassigned programmes</h2>
                    <p>These programmes are listed without a department assignment.</p>
                    <ul>
                      {unassignedProgrammes.map((programme) => <li key={programme}>{programme}</li>)}
                    </ul>
                  </section>
                )}
              </section>
            )}

            {/* ================================================================= */}
            {/* TAB 2: MODULE 1 USER GOVERNANCE (ROLE 1 RIC HEAD VIEW)            */}
            {/* ================================================================= */}
            {activeTab === 'users' && isRICHead(currentUser) && (
              <div className="standard-card p-5 sm:p-6 bg-white border-slate-200 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="font-collegiate text-base font-bold text-[#072b54] flex items-center gap-2">
                      <span>👥</span> Institutional User Governance & Access Control
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage RIC, faculty, and student accounts.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-[#072b54] hover:bg-[#0a3666] text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-2"
                  >
                    <span>➕</span> Add New Institutional User
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search accounts by name, email, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Filter Role:</span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    >
                      <option value="all">All users</option>
                      <option value="admin">RIC Administrators</option>
                      <option value="ric_member">RIC Members</option>
                      <option value="faculty_principal">Staffs</option>
                      <option value="student">Students</option>
                    </select>
                  </div>
                </div>

                {/* Inline Action Alert */}
                {actionMessage && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-2xs ${
                      actionMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <span>{actionMessage.text}</span>
                    <button onClick={() => setActionMessage(null)} className="font-bold px-2 hover:opacity-75">✕</button>
                  </div>
                )}

                {/* User Governance Table */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 uppercase text-[11px] font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Name & Academic Title</th>
                        <th className="px-4 py-3.5">Email Address</th>
                        <th className="px-4 py-3.5">Department</th>
                        <th className="px-4 py-3.5">Institutional Role</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Account Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredUsers.map((user) => (
                        <tr key={user._id || user.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900">{user.name}</div>
                            <div className="text-[11px] text-slate-500">{user.designation || 'Academic Member'}</div>
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-600">{user.email}</td>
                          <td className="px-4 py-4">{user.department || 'BVM Holy Cross'}</td>
                          <td className="px-4 py-4">{getRoleBadge(user.role)}</td>
                          <td className="px-4 py-4">
                            {user.is_active ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                Suspended
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {user.email === currentUser.email ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed" title="Your currently active administrator account cannot be suspended or deleted">
                                <span>🔒</span> Current User
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(user)}
                                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer shadow-2xs ${
                                    user.is_active
                                      ? 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200'
                                      : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200'
                                  }`}
                                  title={user.is_active ? `Suspend access for ${user.name}` : `Restore access for ${user.name}`}
                                >
                                  {user.is_active ? 'Suspend Access' : 'Restore Access'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  className="px-2 py-1.5 rounded-md text-xs font-bold transition cursor-pointer text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-300"
                                  title={`Permanently delete ${user.name}`}
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* 5. PROJECT DOSSIER / RIC EVALUATION DIALOG                           */}
      {/* ===================================================================== */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-2xs overflow-y-auto">
          <div
            className="standard-card max-w-3xl w-full max-h-[92vh] flex flex-col bg-white shadow-2xl rounded-xl border border-slate-300 my-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-review-title"
          >
            {/* Modal Header */}
            <header className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70 rounded-t-xl">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#072b54] bg-[#072b54]/10 px-2 py-0.5 rounded">
                    {selectedProject.project_code}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    selectedProject.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    selectedProject.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    selectedProject.status === 'ongoing' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    selectedProject.status === 'completed' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                    selectedProject.status === 'changes_requested' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                    'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {selectedProject.status === 'pending' ? 'Pending RIC Evaluation' :
                     selectedProject.status === 'approved' ? 'Council Approved' :
                     selectedProject.status === 'ongoing' ? 'Active Progress' :
                     selectedProject.status === 'completed' ? 'Delivered & Completed' :
                     selectedProject.status === 'changes_requested' ? 'Changes Requested' : 'Returned / Rejected'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    • Submitted: {formatProjectDate(selectedProject.submitted_date || selectedProject.createdAt)}
                  </span>
                </div>
                <h2 id="dashboard-review-title" className="font-collegiate text-lg sm:text-xl font-bold text-[#072b54]">
                  {selectedProject.title || 'Untitled Project'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeProjectDossier}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center transition"
                aria-label="Close dossier"
              >
                ✕
              </button>
            </header>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Institutional Academic Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-500">Department</span>
                  <strong className="text-slate-800">{selectedProject.department || 'Not Assigned'}</strong>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-500">Programme / Stream</span>
                  <strong className="text-slate-800">{selectedProject.programme || 'Academic Honours Track'}</strong>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-500">Guide Teacher (Faculty)</span>
                  <strong className="text-slate-800">{selectedProject.guide_teacher || selectedProject.lead_investigator || 'Not Assigned'}</strong>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-500">Principal Submitter</span>
                  <span className="text-slate-800 font-medium">{selectedProject.submitted_by_name || selectedProject.lead_investigator || 'Student'}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-500">Co-Investigators</span>
                  <span className="text-slate-800 font-medium">{selectedProject.student_team_members || (Array.isArray(selectedProject.team_members) ? selectedProject.team_members.join(', ') : 'Single Author')}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-500">Category & Duration</span>
                  <span className="text-slate-800 font-medium">{selectedProject.category} • {selectedProject.duration_months || 12} Months</span>
                </div>
              </div>

              {/* Problem Statement */}
              {selectedProject.problem_statement && (
                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-amber-950 flex items-center gap-1.5">
                    <span>🎯</span> Problem Statement
                  </h4>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                    {selectedProject.problem_statement}
                  </p>
                </div>
              )}

              {/* Objectives */}
              {selectedProject.objectives && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-[#072b54] flex items-center gap-1.5">
                    <span>📋</span> Research Objectives & Milestones
                  </h4>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                    {selectedProject.objectives}
                  </p>
                </div>
              )}

              {/* Abstract */}
              {selectedProject.abstract && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-[#072b54] flex items-center gap-1.5">
                    <span>📄</span> Project Abstract
                  </h4>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                    {selectedProject.abstract}
                  </p>
                </div>
              )}

              {/* Methodology */}
              {selectedProject.methodology && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-[#072b54] flex items-center gap-1.5">
                    <span>⚙️</span> Research Methodology & Implementation
                  </h4>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                    {selectedProject.methodology}
                  </p>
                </div>
              )}

              {/* Innovation */}
              {selectedProject.innovation && (
                <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-emerald-950 flex items-center gap-1.5">
                    <span>💡</span> Innovation & Technical Novelty
                  </h4>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                    {selectedProject.innovation}
                  </p>
                </div>
              )}

              {/* Expected Results */}
              {(selectedProject.expected_results || selectedProject.expected_outcomes) && (
                <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200/80 space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-blue-950 flex items-center gap-1.5">
                    <span>🏆</span> Expected Results, Deliverables & Impact
                  </h4>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                    {selectedProject.expected_results || selectedProject.expected_outcomes}
                  </p>
                </div>
              )}

              {/* Keywords */}
              {selectedProject.keywords && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="font-bold text-slate-600 mr-1">🏷️ Keywords:</span>
                  {selectedProject.keywords.split(',').map((kw, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-medium text-slate-700">
                      #{kw.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Existing RIC Evaluation Record */}
              {(selectedProject.review_comment || selectedProject.reviewed_by_name) && (
                <div className="p-4 rounded-lg bg-slate-100 border border-slate-300 space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
                    <span>🏛️</span> RIC Committee Evaluation Decision
                  </h4>
                  <p className="text-slate-700">
                    Decision: <strong className="capitalize">{selectedProject.status.replace('_', ' ')}</strong>
                    {selectedProject.reviewed_by_name && <span> by {selectedProject.reviewed_by_name}</span>}
                    {selectedProject.reviewed_at && <span> on {formatProjectDate(selectedProject.reviewed_at)}</span>}
                  </p>
                  {selectedProject.review_comment && (
                    <p className="text-slate-700 italic mt-1 bg-white p-2.5 rounded border border-slate-200">
                      "{selectedProject.review_comment}"
                    </p>
                  )}
                  {selectedProject.status === 'changes_requested' && currentUser && currentUser.role === 'student' && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          closeProjectDossier();
                          openProjectRegistration(selectedProject);
                        }}
                        className="px-4 py-2 rounded-lg bg-[#072b54] text-white font-bold text-xs hover:bg-[#0a3666]"
                      >
                        ✏️ Revise & Resubmit Proposal
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 5: AI SIMILARITY ANALYSIS REPORT (RIC MEMBERS ONLY) */}
              {isRICMember(currentUser) && (
                <div className="p-4 rounded-lg bg-linear-to-r from-slate-50 to-indigo-50/50 border border-indigo-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🤖</span>
                      <h4 className="font-collegiate font-bold text-xs uppercase tracking-wide text-[#072b54]">
                        Saved AI Similarity Analysis Report
                      </h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      (selectedProject.similarity_score || (selectedProject.similarity_matches && selectedProject.similarity_matches[0] && selectedProject.similarity_matches[0].score) || 0) >= 50
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : (selectedProject.similarity_score || (selectedProject.similarity_matches && selectedProject.similarity_matches[0] && selectedProject.similarity_matches[0].score) || 0) >= 25
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {selectedProject.similarity_score || (selectedProject.similarity_matches && selectedProject.similarity_matches[0] && selectedProject.similarity_matches[0].score) || 0}% AI Overlap
                    </span>
                  </div>

                  <div className="text-[11px] text-blue-900 bg-blue-50/80 p-2.5 rounded border border-blue-200 flex items-start gap-2">
                    <span>⚖️</span>
                    <span>
                      <strong>RIC Policy Standard:</strong> {selectedProject.similarity_notice || 'AI similarity checks are recorded to assist human academic evaluation. The system never rejects a proposal automatically based on similarity scores.'}
                      {selectedProject.similarity_checked_at ? ` Saved ${formatProjectDate(selectedProject.similarity_checked_at)} for later RIC reference.` : ''}
                    </span>
                  </div>

                  {selectedProject.similarity_matches && selectedProject.similarity_matches.length > 0 ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-[11px] font-bold text-slate-700">Matching Proposals Flagged for Committee Review:</div>
                      {selectedProject.similarity_matches.map((match) => (
                        <div key={match.project_code} className="p-3 rounded-lg bg-white border border-indigo-100 text-xs space-y-1.5 shadow-2xs">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <strong className="text-slate-900">{match.project_code} — {match.title}</strong>
                            <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {match.score}% match
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            <strong>Match Cue:</strong> {match.match_cue || 'Semantic overlap detected'}
                          </p>
                          {match.breakdown && (
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-1 text-[10px] text-slate-600 text-center">
                              <span className="p-1 bg-slate-50 rounded border border-slate-100">Title: {match.breakdown.titles ?? '—'}%</span>
                              <span className="p-1 bg-slate-50 rounded border border-slate-100">Abstract: {match.breakdown.abstracts ?? '—'}%</span>
                              <span className="p-1 bg-slate-50 rounded border border-slate-100">Objectives: {match.breakdown.objectives ?? '—'}%</span>
                              <span className="p-1 bg-slate-50 rounded border border-slate-100">Methods: {match.breakdown.methods ?? '—'}%</span>
                              <span className="p-1 bg-slate-50 rounded border border-slate-100">Keywords: {match.breakdown.keywords ?? '—'}%</span>
                              <span className="p-1 bg-slate-50 rounded border border-slate-100">Results: {match.breakdown.expected_results ?? '—'}%</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                      <span>✅</span>
                      <span>No identical or duplicate proposals detected in the institutional repository. Proposal formulation is original.</span>
                    </div>
                  )}
                </div>
              )}

              {/* RIC PANEL INTERVIEW & ORAL DEFENSE RECORD */}
              {selectedProject.panel_interview && (
                <div className="p-4 rounded-xl bg-linear-to-r from-emerald-50 via-white to-blue-50 border-2 border-emerald-300 space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎙️</span>
                      <div>
                        <h4 className="font-collegiate font-bold text-xs uppercase tracking-wide text-emerald-950">
                          Official RIC Panel Interview & Oral Defense Record
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Conducted {formatProjectDate(selectedProject.panel_interview.interview_date)} • {selectedProject.panel_interview.interview_venue}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-emerald-700 text-white shadow-2xs">
                        Viva Score: {selectedProject.panel_interview.total_score} / 100
                      </span>
                      {selectedProject.approval_letter && (
                        <button
                          type="button"
                          onClick={() => setViewApprovalLetterProject(selectedProject)}
                          className="px-3 py-1 bg-[#072b54] hover:bg-[#0a3666] text-white font-bold text-xs rounded transition shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <span>📜</span> View Sanction Order
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <strong className="text-slate-700">Evaluation Committee:</strong>
                      <p className="text-slate-800 mt-0.5">{selectedProject.panel_interview.panel_members}</p>
                    </div>
                    <div>
                      <strong className="text-slate-700">Interview Mode:</strong>
                      <p className="text-slate-800 mt-0.5">{selectedProject.panel_interview.interview_mode}</p>
                    </div>
                  </div>

                  {selectedProject.panel_interview.viva_scores && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1 text-[10px] text-center">
                      <div className="p-1.5 bg-white rounded border border-emerald-100">
                        <span className="text-slate-500 block">Presentation</span>
                        <strong className="font-mono text-emerald-900 text-[11px]">{selectedProject.panel_interview.viva_scores.presentation ?? 18} / 20</strong>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-emerald-100">
                        <span className="text-slate-500 block">Methodology</span>
                        <strong className="font-mono text-emerald-900 text-[11px]">{selectedProject.panel_interview.viva_scores.methodology ?? 18} / 20</strong>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-emerald-100">
                        <span className="text-slate-500 block">Q&A Defense</span>
                        <strong className="font-mono text-emerald-900 text-[11px]">{selectedProject.panel_interview.viva_scores.defense ?? 18} / 20</strong>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-emerald-100">
                        <span className="text-slate-500 block">Feasibility</span>
                        <strong className="font-mono text-emerald-900 text-[11px]">{selectedProject.panel_interview.viva_scores.feasibility ?? 18} / 20</strong>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-emerald-100">
                        <span className="text-slate-500 block">Novelty</span>
                        <strong className="font-mono text-emerald-900 text-[11px]">{selectedProject.panel_interview.viva_scores.novelty ?? 18} / 20</strong>
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] bg-white p-2.5 rounded border border-emerald-200 text-slate-800">
                    <strong className="text-emerald-950 block mb-0.5">Panel Observations & Directives:</strong>
                    <p className="whitespace-pre-line leading-relaxed">{selectedProject.panel_interview.panel_observations}</p>
                  </div>
                </div>
              )}

              {/* MODULE 6: COMMITTEE REVIEW & EVALUATION RECORDS */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-300 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚖️</span>
                    <h4 className="font-collegiate font-bold text-xs uppercase tracking-wide text-[#072b54]">
                      Committee Review & Evaluation Records
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRICHead(currentUser) && (
                      <button
                        type="button"
                        onClick={() => openAssignModal(selectedProject)}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#072b54] bg-white hover:bg-slate-100 rounded border border-slate-300 transition cursor-pointer"
                      >
                        👥 Manage Reviewers
                      </button>
                    )}
                    {isRICMember(currentUser) && (
                      <button
                        type="button"
                        onClick={() => handleOpenPanelInterview(selectedProject)}
                        className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-2xs transition cursor-pointer flex items-center gap-1"
                      >
                        <span>🎙️</span> {selectedProject.panel_interview ? 'View / Update Panel Viva' : 'Panel Interview & Approve'}
                      </button>
                    )}
                    {isRICMember(currentUser) && (
                      <button
                        type="button"
                        onClick={() => openEvaluationModal(selectedProject)}
                        className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-2xs transition cursor-pointer"
                      >
                        📝 {Array.isArray(selectedProject.evaluations) && selectedProject.evaluations.some(ev => ev.reviewer_id === (currentUser?.id || currentUser?._id)) ? 'Update My Evaluation' : 'Submit Evaluation'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Aggregated Consensus Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Evaluations Completed</span>
                    <strong className="text-base text-[#072b54] font-collegiate">
                      {Array.isArray(selectedProject.evaluations) ? selectedProject.evaluations.length : 0} of {Array.isArray(selectedProject.assigned_reviewers) ? selectedProject.assigned_reviewers.length : 0} Assigned Reviewers
                    </strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Average Score</span>
                    <strong className="text-base font-mono text-emerald-800">
                      {selectedProject.evaluation_summary?.average_score ?? 0} / 100 pts
                    </strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Consensus Recommendation</span>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold ${
                      selectedProject.evaluation_summary?.consensus_recommendation === 'Approve' ? 'bg-emerald-100 text-emerald-800' :
                      selectedProject.evaluation_summary?.consensus_recommendation === 'Revision Required' ? 'bg-amber-100 text-amber-800' :
                      selectedProject.evaluation_summary?.consensus_recommendation === 'Reject' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {selectedProject.evaluation_summary?.consensus_recommendation || 'Awaiting Evaluation'}
                    </span>
                  </div>
                </div>

                {/* Assigned Reviewers List */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold text-slate-700">Designated RIC Reviewers:</div>
                  {Array.isArray(selectedProject.assigned_reviewers) && selectedProject.assigned_reviewers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.assigned_reviewers.map((rev) => {
                        const hasSubmitted = Array.isArray(selectedProject.evaluations) && selectedProject.evaluations.some(ev => ev.reviewer_id === rev.user_id);
                        return (
                          <div key={rev.user_id} className="p-2 bg-white rounded border border-slate-200 text-xs flex items-center gap-2">
                            <span>{hasSubmitted ? '✅' : '⏳'}</span>
                            <div>
                              <strong className="text-slate-800">{rev.name}</strong>
                              <span className="text-slate-500 text-[10px] block">{rev.email} • {hasSubmitted ? 'Evaluated' : 'Evaluation Pending'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[11px] italic">No reviewers currently assigned to this proposal.</p>
                  )}
                </div>

                {/* Evaluation History Sheets */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-[11px] font-bold text-slate-700">Individual Reviewer Scoring Sheets:</div>
                  {Array.isArray(selectedProject.evaluations) && selectedProject.evaluations.length > 0 ? (
                    selectedProject.evaluations.map((ev, i) => (
                      <div key={ev.evaluation_id || i} className="p-3.5 bg-white rounded-lg border border-slate-300 space-y-2.5 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#072b54] text-white flex items-center justify-center font-bold text-[10px]">
                              {i + 1}
                            </span>
                            <div>
                              <strong className="text-slate-900">{ev.reviewer_name}</strong>
                              <span className="text-[10px] text-slate-500 ml-1.5">({ev.reviewer_role}) • Evaluated {formatProjectDate(ev.evaluated_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              Total: {ev.total_score} / 100
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              ev.recommendation === 'Approve' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              ev.recommendation === 'Revision Required' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {ev.recommendation}
                            </span>
                          </div>
                        </div>

                        {/* Criteria Breakdown Grid */}
                        {ev.criteria_scores && (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] text-center">
                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                              <span className="text-slate-500 block">Novelty</span>
                              <strong className="font-mono text-slate-800 text-[11px]">{ev.criteria_scores.novelty ?? 0} / 20</strong>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                              <span className="text-slate-500 block">Methodology</span>
                              <strong className="font-mono text-slate-800 text-[11px]">{ev.criteria_scores.methodology ?? 0} / 20</strong>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                              <span className="text-slate-500 block">Feasibility</span>
                              <strong className="font-mono text-slate-800 text-[11px]">{ev.criteria_scores.feasibility ?? 0} / 20</strong>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                              <span className="text-slate-500 block">Societal Impact</span>
                              <strong className="font-mono text-slate-800 text-[11px]">{ev.criteria_scores.impact ?? 0} / 20</strong>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                              <span className="text-slate-500 block">Clarity</span>
                              <strong className="font-mono text-slate-800 text-[11px]">{ev.criteria_scores.clarity ?? 0} / 20</strong>
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                          <strong className="text-slate-900 block mb-0.5">Reviewer Comments & Directive:</strong>
                          <p className="whitespace-pre-line leading-relaxed">{ev.comments}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      No committee evaluation sheets submitted yet. Assigned reviewers evaluate the proposal across the 5 fixed academic criteria.
                    </div>
                  )}
                </div>
              </div>

              {/* RIC Member Review Controls for Pending Proposals */}
              {isRICMember(currentUser) && selectedProject.status === 'pending' && (
                <div className="p-4 rounded-lg bg-amber-50/90 border border-amber-300 space-y-3 pt-3">
                  <h4 className="font-collegiate font-bold text-sm text-[#072b54] flex items-center gap-1.5">
                    <span>⚖️</span> Research & Innovation Council (RIC) Evaluation Controls
                  </h4>

                  {reviewSimilarityLoading && <p role="status" className="text-xs text-slate-500">Checking for same-department matches…</p>}
                  {reviewSimilarityError && <p role="alert" className="text-xs text-rose-700">{reviewSimilarityError}</p>}
                  {reviewSimilarityMatches.length > 0 && (
                    <div className="dashboard-similarity-notices" role="status">
                      {reviewSimilarityMatches.map((match) => (
                        <p key={match.project_code}>
                          Possible same-department match: <strong>{match.project_code} — {match.title}</strong>
                          {' '}({match.score}%; {match.match_cue}).
                        </p>
                      ))}
                    </div>
                  )}

                  {reviewError && <p role="alert" className="text-xs text-rose-700 font-semibold">{reviewError}</p>}

                  <label className="block text-xs font-bold text-slate-700 space-y-1">
                    Evaluation Comment / Feedback
                    <textarea
                      maxLength={2000}
                      rows="3"
                      placeholder="Enter committee remarks, approval terms, or revision requirements..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                    />
                  </label>

                  <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => handleOpenPanelInterview(selectedProject)}
                      className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-500/40"
                    >
                      <span>🎙️</span> Conduct Panel Interview & Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewProject('reject')}
                      disabled={reviewSubmitting || !reviewComment.trim()}
                      className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs disabled:opacity-50"
                    >
                      {reviewSubmitting ? 'Saving…' : '❌ Reject Proposal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewProject('changes_requested')}
                      disabled={reviewSubmitting || !reviewComment.trim()}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-50"
                    >
                      {reviewSubmitting ? 'Saving…' : '↩️ Request Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewProject('approve')}
                      disabled={reviewSubmitting}
                      className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs disabled:opacity-50"
                    >
                      {reviewSubmitting ? 'Saving…' : '✅ Approve Proposal'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <footer className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 rounded-b-xl">
              <div>
                {(selectedProject.is_submitted_by_user || (currentUser && selectedProject.submitted_by === currentUser.id)) &&
                  (selectedProject.status === 'pending' || selectedProject.status === 'changes_requested') && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        closeProjectDossier();
                        openProjectRegistration(selectedProject);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>✏️</span> Edit Proposal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(selectedProject)}
                      className="px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🗑️</span> Withdraw Proposal
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={closeProjectDossier}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODULE 6: ASSIGN REVIEWERS MODAL */}
      {assignModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="standard-card max-w-lg w-full p-6 bg-white shadow-2xl rounded-xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                  RIC Reviewer Assignment
                </span>
                <h3 className="font-collegiate text-base font-bold text-[#072b54]">
                  Assign Committee Reviewers
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalProject(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{assignModalProject.project_code} — {assignModalProject.title}</div>
              <div className="text-slate-600">Department: {assignModalProject.department} • Student: {assignModalProject.lead_investigator || assignModalProject.submitted_by_name}</div>
            </div>

            {assignError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {assignError}
              </div>
            )}

            {assignSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {assignSuccess}
              </div>
            )}

            <form onSubmit={handleAssignReviewersSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-2">
                  Select RIC Reviewers for this Proposal *
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Assigned reviewers will examine and score this proposal across the 5 fixed academic criteria.
                </p>

                <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                  {availableReviewers.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Loading committee reviewers...</p>
                  ) : (
                    availableReviewers.map((rev) => {
                      const isSelected = selectedReviewerIds.includes(rev.id || rev._id);
                      return (
                        <label
                          key={rev.id || rev._id}
                          className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const revId = rev.id || rev._id;
                              if (e.target.checked) {
                                setSelectedReviewerIds((prev) => [...prev, revId]);
                              } else {
                                setSelectedReviewerIds((prev) => prev.filter((id) => id !== revId));
                              }
                            }}
                            className="mt-0.5 rounded text-[#072b54] focus:ring-[#072b54]"
                          />
                          <div className="flex-1 text-[11px]">
                            <div className="font-bold flex items-center justify-between">
                              <span>{rev.name}</span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-200/80 rounded text-slate-700">
                                {rev.role === 'ric_head' ? 'RIC Head' : rev.role === 'ric_admin' ? 'RIC Admin' : 'RIC Member'}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[10px]">{rev.email} • {rev.designation}</div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAssignModalProject(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting || selectedReviewerIds.length === 0}
                  className="px-5 py-2 bg-[#072b54] hover:bg-[#0a3666] text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {assignSubmitting ? 'Assigning...' : `Assign (${selectedReviewerIds.length}) Reviewer(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODULE 6: FIXED CRITERIA EVALUATION FORM MODAL */}
      {evalModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-2xs overflow-y-auto">
          <div className="standard-card max-w-2xl w-full max-h-[92vh] flex flex-col bg-white shadow-2xl rounded-xl border border-slate-300 my-auto">
            {/* Header */}
            <header className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70 rounded-t-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#072b54] bg-[#072b54]/10 px-2 py-0.5 rounded">
                    {evalModalProject.project_code}
                  </span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    Fixed Criteria Evaluation Form
                  </span>
                </div>
                <h2 className="font-collegiate text-lg font-bold text-[#072b54] mt-1">
                  {evalModalProject.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Department: {evalModalProject.department} • Student: {evalModalProject.lead_investigator || evalModalProject.submitted_by_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEvalModalProject(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </header>

            {/* Form Body */}
            <form onSubmit={handleSubmitEvaluation} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {evalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {evalError}
                </div>
              )}

              {evalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  {evalSuccess}
                </div>
              )}

              {/* 5 Fixed Criteria Scoring Cards */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h4 className="font-collegiate font-bold text-slate-800 uppercase text-xs tracking-wider">
                    1. Fixed Academic Evaluation Criteria (20 Points Each • Max 100 Points)
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Composite Total:</span>
                    <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-sm ${
                      (Object.values(evaluationForm.criteria_scores).reduce((a, b) => a + Number(b), 0)) >= 75
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : (Object.values(evaluationForm.criteria_scores).reduce((a, b) => a + Number(b), 0)) >= 50
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {Object.values(evaluationForm.criteria_scores).reduce((a, b) => a + Number(b), 0)} / 100
                    </span>
                  </div>
                </div>

                {evaluationRubric.map((criterion, idx) => {
                  const currentScore = evaluationForm.criteria_scores[criterion.id] ?? 0;
                  return (
                    <div key={criterion.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong className="text-slate-900 font-collegiate text-xs">
                            {idx + 1}. {criterion.label}
                          </strong>
                          <p className="text-[11px] text-slate-500">{criterion.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={criterion.max_score}
                            step="0.5"
                            value={currentScore}
                            onChange={(e) => {
                              const val = Math.min(criterion.max_score, Math.max(0, Number(e.target.value) || 0));
                              setEvaluationForm((prev) => ({
                                ...prev,
                                criteria_scores: {
                                  ...prev.criteria_scores,
                                  [criterion.id]: val
                                }
                              }));
                            }}
                            className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-300 bg-white"
                          />
                          <span className="text-slate-400 font-mono text-[11px]">/ {criterion.max_score} pts</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max={criterion.max_score}
                        step="0.5"
                        value={currentScore}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEvaluationForm((prev) => ({
                            ...prev,
                            criteria_scores: {
                              ...prev.criteria_scores,
                              [criterion.id]: val
                            }
                          }));
                        }}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#072b54]"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Recommendation */}
              <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200 space-y-2.5">
                <label className="block font-collegiate font-bold text-slate-800 uppercase text-xs">
                  2. Committee Recommendation *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'Approve', label: '✅ Approve', desc: 'Meets high academic standards; recommend for council sanction.' },
                    { id: 'Revision Required', label: '↩️ Revision Required', desc: 'Promising idea requiring methodological or scope improvements.' },
                    { id: 'Reject', label: '❌ Reject', desc: 'Does not satisfy institutional research criteria.' }
                  ].map((option) => (
                    <label
                      key={option.id}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        evaluationForm.recommendation === option.id
                          ? 'bg-white border-[#072b54] shadow-xs ring-1 ring-[#072b54]'
                          : 'bg-white/70 border-amber-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="eval_recommendation"
                          value={option.id}
                          checked={evaluationForm.recommendation === option.id}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, recommendation: e.target.value })}
                          className="text-[#072b54] focus:ring-[#072b54]"
                        />
                        <strong className="text-xs text-slate-900">{option.label}</strong>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 pl-5">{option.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Qualitative Comments & Recommendations */}
              <div className="space-y-1.5">
                <label className="block font-collegiate font-bold text-slate-800 uppercase text-xs">
                  3. Qualitative Evaluation Comments & Actionable Feedback *
                </label>
                <p className="text-[11px] text-slate-500">
                  Provide detailed justification for the scores awarded, specific strengths, gaps in methodology, and instructions for the researcher.
                </p>
                <textarea
                  required
                  rows="4"
                  maxLength={3000}
                  placeholder="Record comprehensive evaluation commentary..."
                  value={evaluationForm.comments}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, comments: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Minimum quality threshold: comprehensive feedback required.</span>
                  <span>{evaluationForm.comments.length} / 3000 chars</span>
                </div>
              </div>

              {/* Footer Buttons inside modal */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEvalModalProject(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evalSubmitting || !evaluationForm.comments.trim()}
                  className="px-5 py-2 bg-[#072b54] hover:bg-[#0a3666] text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {evalSubmitting ? 'Submitting Evaluation…' : 'Submit Evaluation Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODULE 8: GUIDE REVIEW MODAL */}
      {selectedGuideProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-2xs overflow-y-auto">
          <div className="standard-card max-w-2xl w-full p-6 bg-white shadow-2xl rounded-xl border border-slate-300 space-y-4 my-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                  Faculty Guide Review & Recommendation
                </span>
                <h3 className="font-collegiate text-base font-bold text-[#072b54]">
                  Review Assigned Student Proposal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedGuideProject.project_code} • {selectedGuideProject.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuideProject(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-200 pb-2">
                <div><span className="text-slate-500 font-bold">Student:</span> {selectedGuideProject.lead_investigator || selectedGuideProject.submitted_by_name}</div>
                <div><span className="text-slate-500 font-bold">Reg Number:</span> {selectedGuideProject.register_number || 'N/A'}</div>
                <div><span className="text-slate-500 font-bold">Course:</span> {selectedGuideProject.course || selectedGuideProject.programme}</div>
                <div><span className="text-slate-500 font-bold">Academic Year:</span> {selectedGuideProject.academic_year || '2026-27'}</div>
              </div>
              <div>
                <strong className="text-slate-900 block mb-0.5">Abstract:</strong>
                <p className="text-slate-600 leading-relaxed">{selectedGuideProject.abstract}</p>
              </div>
              {selectedGuideProject.methodology && (
                <div>
                  <strong className="text-slate-900 block mb-0.5">Methodology:</strong>
                  <p className="text-slate-600 leading-relaxed">{selectedGuideProject.methodology}</p>
                </div>
              )}
            </div>

            {guideReviewError && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {guideReviewError}
              </div>
            )}

            <form onSubmit={handleSubmitGuideReview} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-2">
                  Guide Recommendation Directive *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-3 rounded-lg border cursor-pointer transition flex items-center gap-2 ${
                    guideReviewForm.recommendation === 'recommended'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="guide_rec"
                      value="recommended"
                      checked={guideReviewForm.recommendation === 'recommended'}
                      onChange={(e) => setGuideReviewForm({ ...guideReviewForm, recommendation: e.target.value })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block text-xs">✅ Recommended</span>
                      <span className="text-[10px] text-slate-500 font-normal">Forward to RIC</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-lg border cursor-pointer transition flex items-center gap-2 ${
                    guideReviewForm.recommendation === 'revision_required'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="guide_rec"
                      value="revision_required"
                      checked={guideReviewForm.recommendation === 'revision_required'}
                      onChange={(e) => setGuideReviewForm({ ...guideReviewForm, recommendation: e.target.value })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="block text-xs">↩️ Revision Required</span>
                      <span className="text-[10px] text-slate-500 font-normal">Return to student</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-lg border cursor-pointer transition flex items-center gap-2 ${
                    guideReviewForm.recommendation === 'not_recommended'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="guide_rec"
                      value="not_recommended"
                      checked={guideReviewForm.recommendation === 'not_recommended'}
                      onChange={(e) => setGuideReviewForm({ ...guideReviewForm, recommendation: e.target.value })}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="block text-xs">❌ Not Recommended</span>
                      <span className="text-[10px] text-slate-500 font-normal">Flag with caveats</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Guide Comments & Mentorship Directives *
                </label>
                <textarea
                  required
                  rows="4"
                  maxLength={3000}
                  placeholder="Enter detailed academic feedback, required revisions, or reasons for your recommendation..."
                  value={guideReviewForm.comments}
                  onChange={(e) => setGuideReviewForm({ ...guideReviewForm, comments: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedGuideProject(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={guideReviewSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white font-bold shadow-2xs disabled:opacity-50"
                >
                  {guideReviewSubmitting ? 'Recording…' : 'Submit Guide Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODULE 9: OFFICIAL RIC COUNCIL DECISION MODAL (6 STATES) */}
      {selectedDecisionProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-2xs overflow-y-auto">
          <div className="standard-card max-w-2xl w-full p-6 bg-white shadow-2xl rounded-xl border border-slate-300 space-y-4 my-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#072b54] bg-[#072b54]/10 px-2 py-0.5 rounded">
                    {selectedDecisionProject.project_code}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                    Section 9: Official Approval Order
                  </span>
                </div>
                <h3 className="font-collegiate text-base font-bold text-[#072b54] mt-1">
                  Research & Innovation Council Official Decision
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDecisionProject.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDecisionProject(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {officialDecisionError && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {officialDecisionError}
              </div>
            )}

            <form onSubmit={handleSubmitOfficialDecision} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-2">
                  Select Official Council Decision (6 Institutional Decision States) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'approved', label: 'Approved', desc: 'The proposal is accepted and sanctioned.' },
                    { key: 'approved_with_modifications', label: 'Approved with modifications', desc: 'Accepted subject to specified minor changes.' },
                    { key: 'changes_requested', label: 'Changes required', desc: 'Student must revise the proposal and resubmit.' },
                    { key: 'topic_change_required', label: 'Topic change required', desc: 'RIC requires a different or substantially revised topic.' },
                    { key: 'rejected', label: 'Rejected', desc: 'Proposal not accepted, reasons recorded.' },
                    { key: 'further_review', label: 'Further review', desc: 'Additional examination required before decision.' }
                  ].map((d) => (
                    <label key={d.key} className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-2 ${
                      officialDecisionForm.decision === d.key
                        ? d.key.includes('approved')
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : d.key.includes('reject')
                            ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold'
                            : 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="official_decision"
                        value={d.key}
                        checked={officialDecisionForm.decision === d.key}
                        onChange={(e) => setOfficialDecisionForm({ ...officialDecisionForm, decision: e.target.value })}
                        className="mt-0.5 text-[#072b54]"
                      />
                      <div>
                        <span className="block text-xs font-bold">{d.label}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{d.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {officialDecisionForm.decision === 'approved_with_modifications' && (
                <div>
                  <label className="block font-bold text-amber-900 uppercase mb-1">
                    Approval Conditions & Minor Changes *
                  </label>
                  <input
                    required
                    maxLength={3000}
                    placeholder="e.g. Include preliminary literature review citations and submit revised consent form."
                    value={officialDecisionForm.conditions}
                    onChange={(e) => setOfficialDecisionForm({ ...officialDecisionForm, conditions: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-amber-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Committee Directive / Remarks & Reasons {['rejected', 'changes_requested', 'topic_change_required'].includes(officialDecisionForm.decision) ? '*' : '(Optional)'}
                </label>
                <textarea
                  required={['rejected', 'changes_requested', 'topic_change_required'].includes(officialDecisionForm.decision)}
                  rows="3"
                  maxLength={5000}
                  placeholder="Enter the official rationale, directives, or remarks approved by the RIC council..."
                  value={officialDecisionForm.comments}
                  onChange={(e) => setOfficialDecisionForm({ ...officialDecisionForm, comments: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Authorizing Signatory Name</label>
                  <input
                    value={officialDecisionForm.signatory_name}
                    onChange={(e) => setOfficialDecisionForm({ ...officialDecisionForm, signatory_name: e.target.value })}
                    placeholder="e.g. Rev. Fr. Principal & RIC Head"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Signatory Title</label>
                  <input
                    value={officialDecisionForm.signatory_title}
                    onChange={(e) => setOfficialDecisionForm({ ...officialDecisionForm, signatory_title: e.target.value })}
                    placeholder="e.g. Head, Research & Innovation Cell / Principal"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedDecisionProject(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={officialDecisionSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#072b54] hover:bg-[#0a3666] text-white font-bold shadow-2xs disabled:opacity-50"
                >
                  {officialDecisionSubmitting ? 'Recording Decision…' : 'Confirm Official Council Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* RIC PANEL INTERVIEW & LIVE DEFENSE APPROVAL MODAL                   */}
      {/* =================================================================== */}
      {panelInterviewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white max-w-3xl w-full p-6 sm:p-8 rounded-xl shadow-2xl border border-slate-300 space-y-6 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                  <span>🏛️ BVM Holy Cross College, Cherpunkal</span>
                  <span>•</span>
                  <span>Research & Innovation Cell (RIC)</span>
                </div>
                <h3 className="font-collegiate text-xl font-bold text-[#072b54] flex items-center gap-2">
                  <span>🎙️</span> Panel Interview & Oral Defense Evaluation
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Conduct live viva voce, record committee defense marks, and accord on-the-spot official institutional approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelInterviewProject(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Candidate & Project Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <span className="font-mono font-bold text-[#072b54] bg-[#072b54]/10 px-2 py-0.5 rounded text-[11px]">
                    {panelInterviewProject.project_code}
                  </span>
                  <strong className="text-slate-800 text-sm ml-2 font-collegiate">
                    {panelInterviewProject.title}
                  </strong>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                  {panelInterviewProject.academic_year || '2026-27'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600">
                <div><strong>Candidate:</strong> {panelInterviewProject.lead_investigator || panelInterviewProject.submitted_by_name} {panelInterviewProject.register_number ? `(${panelInterviewProject.register_number})` : ''}</div>
                <div><strong>Department:</strong> {panelInterviewProject.department}</div>
                <div><strong>Faculty Guide:</strong> {panelInterviewProject.guide_name || panelInterviewProject.guide_teacher}</div>
              </div>
            </div>

            {panelError && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {panelError}
              </div>
            )}

            <form onSubmit={handleSubmitPanelInterview} className="space-y-5 text-xs">
              {/* Section 1: Logistics */}
              <div className="space-y-3 p-4 rounded-lg bg-blue-50/50 border border-blue-200/80">
                <h4 className="font-collegiate font-bold text-xs uppercase tracking-wide text-[#072b54] flex items-center gap-1.5">
                  <span>📅</span> 1. Panel Interview Logistics & Committee Attendance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Date & Time of Interview *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={panelForm.interview_date}
                      onChange={(e) => setPanelForm({ ...panelForm, interview_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Interview Venue / Chamber *
                    </label>
                    <input
                      type="text"
                      required
                      value={panelForm.interview_venue}
                      onChange={(e) => setPanelForm({ ...panelForm, interview_venue: e.target.value })}
                      placeholder="e.g. Research & Innovation Cell (RIC) Room / Boardroom"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Panel Members Present (Committee Evaluators) *
                  </label>
                  <input
                    type="text"
                    required
                    value={panelForm.panel_members}
                    onChange={(e) => setPanelForm({ ...panelForm, panel_members: e.target.value })}
                    placeholder="e.g. Ansu Maria Benny (RIC Member), Dr. Angelin Thomas (RIC Member)"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    List all RIC committee members and faculty experts participating in this candidate's viva voce.
                  </span>
                </div>
              </div>

              {/* Section 2: Defense Rubric Scores */}
              <div className="space-y-3 p-4 rounded-lg bg-emerald-50/40 border border-emerald-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                  <h4 className="font-collegiate font-bold text-xs uppercase tracking-wide text-emerald-950 flex items-center gap-1.5">
                    <span>📊</span> 2. Live Oral Defense & Viva Voce Rubric (Max 20 Pts Each)
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">Total Viva Score:</span>
                    <strong className={`font-mono text-sm px-2.5 py-0.5 rounded font-bold ${
                      panelForm.total_score >= 80 ? 'bg-emerald-700 text-white' :
                      panelForm.total_score >= 60 ? 'bg-amber-600 text-white' :
                      'bg-rose-700 text-white'
                    }`}>
                      {panelForm.total_score} / 100
                    </strong>
                    <span className="text-[11px] font-bold text-slate-600">
                      {panelForm.total_score >= 80 ? '🌟 Highly Commended' :
                       panelForm.total_score >= 60 ? '✅ Satisfactory Defense' :
                       '⚠️ Revisions Advised'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1">
                  {[
                    { key: 'presentation', label: 'Presentation & Knowledge', desc: 'Clarity, mastery of subject' },
                    { key: 'methodology', label: 'Technical Methodology', desc: 'Soundness of research plan' },
                    { key: 'defense', label: 'Viva Q&A Defense', desc: 'Critical thinking & answers' },
                    { key: 'feasibility', label: 'Feasibility & Timeline', desc: 'Deliverables & resources' },
                    { key: 'novelty', label: 'Novelty & Utility', desc: 'Originality & societal benefit' }
                  ].map((dim) => (
                    <div key={dim.key} className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                      <span className="block font-bold text-slate-700 text-[11px] leading-tight">{dim.label}</span>
                      <span className="block text-[10px] text-slate-400">{dim.desc}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          required
                          value={panelForm.viva_scores[dim.key] ?? 18}
                          onChange={(e) => handleUpdateVivaScore(dim.key, e.target.value)}
                          className="w-full px-2 py-1 text-center font-mono font-bold rounded border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-emerald-600"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">/20</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Panel Observations */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Panel Interview Directives, Questions & Observations *
                </label>
                <textarea
                  required
                  rows="3"
                  maxLength={5000}
                  value={panelForm.panel_observations}
                  onChange={(e) => setPanelForm({ ...panelForm, panel_observations: e.target.value })}
                  placeholder="Record key questions addressed during defense, strengths identified, and specific directives provided to the student..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-[#072b54]"
                />
              </div>

              {/* Section 4: Approval Decision Selection */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-2">
                  Panel Sanction Verdict *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'approved', label: '✅ Sanction & Approve Project Proposal', desc: 'Immediate formal institutional approval order issued.' },
                    { key: 'approved_with_modifications', label: '🟡 Approve Subject to Panel Modifications', desc: 'Sanction accorded subject to specified minor changes.' },
                    { key: 'changes_requested', label: '↩️ Request Revisions based on Interview', desc: 'Student must modify proposal and face re-interview.' },
                    { key: 'rejected', label: '❌ Reject after Panel Defense', desc: 'Proposal not accepted following interview defense.' }
                  ].map((opt) => (
                    <label key={opt.key} className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-2 ${
                      panelForm.decision === opt.key
                        ? opt.key.includes('approved')
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : opt.key.includes('reject')
                            ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold'
                            : 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="panel_decision"
                        value={opt.key}
                        checked={panelForm.decision === opt.key}
                        onChange={(e) => setPanelForm({ ...panelForm, decision: e.target.value })}
                        className="mt-0.5 text-[#072b54]"
                      />
                      <div>
                        <span className="block text-xs font-bold">{opt.label}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {panelForm.decision === 'approved_with_modifications' && (
                <div>
                  <label className="block font-bold text-amber-900 uppercase mb-1">
                    Conditions Imposed by Panel *
                  </label>
                  <input
                    required
                    maxLength={3000}
                    placeholder="e.g. Incorporate empirical dataset sample size expansion as discussed in viva."
                    value={panelForm.conditions}
                    onChange={(e) => setPanelForm({ ...panelForm, conditions: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-amber-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Section 5: Signatories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Authorizing Panel Chair / RIC Signatory</label>
                  <input
                    value={panelForm.signatory_name}
                    onChange={(e) => setPanelForm({ ...panelForm, signatory_name: e.target.value })}
                    placeholder="e.g. Ansu Maria Benny & Dr. Angelin Thomas"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Signatory Title</label>
                  <input
                    value={panelForm.signatory_title}
                    onChange={(e) => setPanelForm({ ...panelForm, signatory_title: e.target.value })}
                    placeholder="e.g. Head, Research & Innovation Cell / Principal"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPanelInterviewProject(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={panelSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span>🎓</span> {panelSubmitting ? 'Recording Sanction…' : 'Issue Official Panel Approval & Generate Sanction Order →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODULE 9: OFFICIAL SANCTION & APPROVAL ORDER LETTER VIEWER */}
      {viewApprovalLetterProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0">
          <div className="bg-white max-w-2xl w-full p-6 sm:p-8 rounded-xl shadow-2xl border border-slate-300 space-y-6 my-auto print:shadow-none print:border-none print:w-full print:max-w-none">
            {/* Action Bar (hidden on print) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                Official Institutional Sanction Order
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#072b54] hover:bg-[#0a3666] text-white font-bold text-xs rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️</span> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setViewApprovalLetterProject(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Letterhead */}
            <div className="text-center space-y-1.5 border-b-2 border-[#072b54] pb-4">
              <div className="w-12 h-12 rounded-full bg-[#072b54] text-amber-400 font-collegiate font-bold text-xl flex items-center justify-center mx-auto shadow-sm">
                BVM
              </div>
              <h1 className="font-collegiate text-lg sm:text-xl font-black text-[#072b54] tracking-wider uppercase">
                Bishop Vayalil Memorial Holy Cross College
              </h1>
              <p className="text-xs font-serif text-slate-600">
                Cherpunkal P.O., Kottayam, Kerala — 686584 | Affiliated to Mahatma Gandhi University
              </p>
              <div className="inline-block bg-amber-50 border border-amber-300 px-3 py-0.5 rounded-full text-[11px] font-bold text-amber-900 uppercase tracking-widest mt-1">
                Research & Innovation Cell (RIC)
              </div>
            </div>

            {/* Letter Metadata */}
            <div className="flex items-center justify-between text-xs text-slate-700 border-b border-slate-100 pb-2">
              <div>
                <strong>Sanction Order No:</strong>{' '}
                <span className="font-mono text-[#072b54] font-bold">
                  {(viewApprovalLetterProject.approval_letter && viewApprovalLetterProject.approval_letter.letter_number) || `BVM/RIC/APPR/${viewApprovalLetterProject.academic_year || '2026-27'}/SANCTION`}
                </span>
              </div>
              <div>
                <strong>Date of Issue:</strong>{' '}
                <span>{formatProjectDate(viewApprovalLetterProject.approval_letter?.issue_date || viewApprovalLetterProject.updatedAt || new Date())}</span>
              </div>
            </div>

            {/* Order Title */}
            <div className="text-center py-1">
              <h2 className="font-collegiate text-base font-bold text-[#072b54] tracking-wide uppercase underline decoration-amber-500 decoration-2 underline-offset-4">
                Formal Project Sanction & Approval Order
              </h2>
            </div>

            {/* Proposal Details Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <td className="p-2.5 font-bold text-slate-700 w-1/3 border-r border-slate-200">Project Code & Title</td>
                    <td className="p-2.5 font-semibold text-[#072b54]">{viewApprovalLetterProject.project_code} — {viewApprovalLetterProject.title}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">Principal Student Investigator</td>
                    <td className="p-2.5 text-slate-800 font-medium">
                      {viewApprovalLetterProject.lead_investigator || viewApprovalLetterProject.submitted_by_name}
                      {viewApprovalLetterProject.register_number ? ` (Reg No: ${viewApprovalLetterProject.register_number})` : ''}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">Academic Department</td>
                    <td className="p-2.5 text-slate-800">{viewApprovalLetterProject.department}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">Programme / Master Course</td>
                    <td className="p-2.5 text-slate-800">{viewApprovalLetterProject.course || viewApprovalLetterProject.programme}</td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">Assigned Faculty Guide</td>
                    <td className="p-2.5 text-slate-800">{viewApprovalLetterProject.guide_name || viewApprovalLetterProject.guide_teacher}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">Project Category & Duration</td>
                    <td className="p-2.5 text-slate-800">{viewApprovalLetterProject.category} • {viewApprovalLetterProject.duration_months || 12} Months</td>
                  </tr>
                  {(viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview) && (
                    <>
                      <tr className="border-b border-slate-200 bg-emerald-50/70">
                        <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">Oral Defense & Panel Interview</td>
                        <td className="p-2.5 text-emerald-950 font-semibold">
                          Conducted on {formatProjectDate((viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview).interview_date)} • {(viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview).interview_venue}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">RIC Examination Panel</td>
                        <td className="p-2.5 text-slate-800">
                          {(viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview).panel_members}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-emerald-50/70">
                        <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">Panel Viva Voce Score</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-900">
                          {(viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview).total_score} / 100 [Cleared & Sanction Accorded]
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200">Approval Conditions / Remarks</td>
                    <td className="p-2.5 text-slate-800 italic">
                      {(viewApprovalLetterProject.approval_letter && viewApprovalLetterProject.approval_letter.conditions) ||
                       (viewApprovalLetterProject.official_decision && viewApprovalLetterProject.official_decision.conditions) ||
                       'Sanction granted in compliance with Institutional Research and Ethics regulations.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Formal Text */}
            <p className="text-xs text-slate-700 leading-relaxed text-justify">
              {(viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview) ? (
                <>
                  The Research and Innovation Cell (RIC) Panel of Bishop Vayalil Memorial Holy Cross College, Cherpunkal, having conducted a formal Oral Presentation and Viva Voce Defense on {formatProjectDate((viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview).interview_date)} at {(viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview).interview_venue} before the designated Evaluation Panel ({(viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview).panel_members}), and upon satisfactory evaluation with a viva score of {(viewApprovalLetterProject.panel_interview || viewApprovalLetterProject.approval_letter?.panel_interview).total_score}/100, hereby accords formal institutional approval for the execution of the research project cited above.
                </>
              ) : (
                <>
                  The Research and Innovation Cell (RIC) of Bishop Vayalil Memorial Holy Cross College, Cherpunkal, after due scrutiny of the submitted proposal, technical evaluation by designated committee reviewers, and similarity verification, hereby accords formal institutional approval for the execution of the research project cited above.
                </>
              )}
            </p>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div className="space-y-1">
                <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
                <strong className="block text-[#072b54] font-collegiate">Ansu Maria Benny & Dr. Angelin Thomas</strong>
                <span className="text-[11px] text-slate-500 block">Research & Innovation Cell (RIC) Committee</span>
                <span className="text-[10px] text-slate-400 block">BVM Holy Cross College, Cherpunkal</span>
              </div>
              <div className="space-y-1">
                <div className="border-b border-slate-400 w-36 mx-auto mb-1"></div>
                <strong className="block text-[#072b54] font-collegiate">Rev. Fr. Principal</strong>
                <span className="text-[11px] text-slate-500 block">Principal & Patron</span>
                <span className="text-[10px] text-slate-400 block">BVM Holy Cross College, Cherpunkal</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW INSTITUTIONAL USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="standard-card max-w-lg w-full p-6 border-slate-300 space-y-4 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-collegiate text-base font-bold text-[#072b54]">
                ➕ Add New Institutional Account
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {createError}
              </div>
            )}

            

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Teresa John / Nidhin Paul"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@gmail.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Institutional Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                  >
                    <option value="student">🎓 Student</option>
                    <option value="faculty_principal">👨‍🏫 Staff</option>
                    <option value="ric_member">🛡️ RIC Member</option>
                    <option value="admin">🏛️ RIC Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Department *</label>
                  <select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                  >
                    {OFFICIAL_INSTITUTIONAL_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#072b54]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-[#072b54] hover:bg-[#0a3666] text-white font-bold rounded-lg shadow-2xs disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Mount React Root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
