import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Project from '../models/Project.js';
import { isMongoDBConnected } from './connect.js';
import { listFaculty } from './institutionRepository.js';
import { applyReviewUpdate, computeEvaluationSummary } from '../services/projectReview.js';
import { createSimilarityReport, SIMILARITY_ADVISORY_NOTICE } from '../services/projectSimilarity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

function isRICUser(user) {
  return Boolean(user && ['ric_head', 'ric_admin', 'ric_member'].includes(user.role));
}

function isVisibleToUser(project, user) {
  if (!user || isRICUser(user)) return true;
  const isOwner = ['student', 'faculty_principal', 'institutional_user'].includes(user.role)
    && project.submitted_by === user.id;

  // A student belongs to only 1 department.
  // They strictly see records from their own single enrolled department (plus their own submissions).
  if (user.role === 'student') {
    const userDept = (user.department || '').trim().toLowerCase();
    const projDept = (project.department || '').trim().toLowerCase();
    const isSameDept = Boolean(
      userDept && (
        projDept === userDept ||
        projDept.includes(userDept) ||
        userDept.includes(projDept)
      )
    );
    return isOwner || (isSameDept && (project.status === 'approved' || project.status === 'ongoing' || project.status === 'completed'));
  }

  if (user.role === 'faculty_principal' || user.role === 'institutional_user') {
    return project.status === 'approved' || isOwner;
  }
  return project.status === 'approved';
}

function removePrivateProjectFields(project, user) {
  if (!user || isRICUser(user)) return project;
  const {
    similarity_matches,
    similarity_score,
    similarity_checked_at,
    similarity_notice,
    submitted_by,
    reviewed_by,
    reviewed_by_name,
    review_comment,
    ...visibleProject
  } = project;
  const isOwner = ['student', 'faculty_principal', 'institutional_user'].includes(user.role)
    && submitted_by === user.id;
  return {
    ...visibleProject,
    is_submitted_by_user: isOwner,
    review_comment: isOwner ? review_comment : '',
    ...(isOwner ? {
      similarity_matches: similarity_matches || [],
      similarity_score: similarity_score || 0,
      similarity_checked_at: similarity_checked_at || null,
      similarity_notice: similarity_notice || SIMILARITY_ADVISORY_NOTICE
    } : {})
  };
}

function getProjectTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function saveLocalProjects(projects) {
  fs.writeFileSync(LOCAL_PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readLocalProjects() {
  try {
    if (!fs.existsSync(LOCAL_PROJECTS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(LOCAL_PROJECTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[ProjectRepository] Read error:', err.message);
    return [];
  }
}

export function writeLocalProjects(projects) {
  try {
    fs.writeFileSync(LOCAL_PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ProjectRepository] Write error:', err.message);
  }
}

export async function listComparisonProjects() {
  if (isMongoDBConnected()) {
    return Project.find().lean();
  }
  return readLocalProjects();
}

function similarityUpdate(report) {
  return {
    similarity_matches: Array.isArray(report.similarity_matches) ? report.similarity_matches : [],
    similarity_score: Number.isFinite(report.similarity_score) ? report.similarity_score : 0,
    similarity_checked_at: report.similarity_checked_at || new Date().toISOString(),
    similarity_notice: report.similarity_notice || SIMILARITY_ADVISORY_NOTICE
  };
}

export async function saveSimilarityReport(projectId, report) {
  const update = similarityUpdate(report || {});

  if (isMongoDBConnected()) {
    return Project.findOneAndUpdate(
      { $or: [{ _id: projectId }, { project_code: projectId }] },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
  }

  const projects = readLocalProjects();
  const project = projects.find((item) => item._id === projectId || item.project_code === projectId);
  if (!project) return null;
  const previousStatus = project.status;
  Object.assign(project, update, { status: previousStatus });
  writeLocalProjects(projects);
  return project;
}

export async function backfillSimilarityReports() {
  if (isMongoDBConnected()) {
    const projects = await Project.find().lean();
    let changed = 0;
    for (const project of projects) {
      if (project.similarity_checked_at) continue;
      const report = createSimilarityReport(project, projects, { excludeProjectId: project._id });
      await Project.updateOne({ _id: project._id }, { $set: similarityUpdate(report) });
      changed += 1;
    }
    return changed;
  }

  const projects = readLocalProjects();
  let changed = 0;
  for (const project of projects) {
    if (project.similarity_checked_at) continue;
    const report = createSimilarityReport(project, projects, { excludeProjectId: project._id });
    Object.assign(project, similarityUpdate(report));
    changed += 1;
  }
  if (changed > 0) writeLocalProjects(projects);
  return changed;
}

// BVM Holy Cross College, Cherpunkal - Institutional Projects Dataset with unknown dates left unset
export function getDefaultProjects() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return [
    {
      project_code: 'BVM/RIC/2026/CYBER/001',
      title: 'Automated Threat Hunting & Zero-Day Malware Triage via Deep Neural Telemetry',
      department: 'Department of Cyber Forensics',
      programme: 'B.Sc. (Honours) Cyber Forensics — Network Security & Operating System Architecture',
      guide_teacher: 'Dr. George Kutty Varghese (Professor & HOD, Cyber Forensics)',
      lead_investigator: 'Dr. George Kutty Varghese',
      team_members: ['Alphy Maria (Student Scholar)', 'Nidhin Paul (Student Co-Investigator)'],
      student_team_members: 'Alphy Maria, Nidhin Paul',
      category: 'Research',
      status: 'pending',
      abstract: 'Autonomous kernel-level telemetry parser leveraging recurrent neural networks to detect evasive fileless malware, abnormal memory injection, and lateral privilege escalation in enterprise academic network enclaves.',
      problem_statement: 'Traditional signature-based antivirus scanners fail against obfuscated and zero-day memory-resident payloads, leaving educational campus networks vulnerable to data exfiltration and credential stuffing.',
      objectives: '1. Develop a non-intrusive eBPF Linux kernel event collector.\n2. Train an offline bidirectional LSTM model on anomalous syscall vectors.\n3. Deploy low-latency alerts on BVM Holy Cross intranet servers.',
      methodology: 'Real-time socket monitoring using eBPF probes, feature extraction via syscall n-grams, classification using Quantized ONNX Runtime, and automated firewall isolation.',
      keywords: 'Cyber Forensics, eBPF Kernel, Zero-Day Malware, Neural Telemetry, Intrusion Detection',
      innovation: 'First kernel-level eBPF behavioral classifier tuned specifically for collegiate subnet traffic without requiring costly cloud SIEM subscriptions.',
      expected_results: 'A lightweight open-source detection daemon achieving >98.4% detection on evasive ransomware samples with under 3% CPU overhead.',
      expected_outcomes: 'A lightweight open-source detection daemon achieving >98.4% detection on evasive ransomware samples with under 3% CPU overhead.',
      duration_months: 12,
      submitted_date: new Date(now - 3 * day).toISOString(),
      review_deadline: new Date(now + 5 * day).toISOString(),
      last_activity: 'Proposal submitted; assigned to RIC Review Committee for technical evaluation',
      ethics_clearance: 'Approved by Institutional Data Board',
      milestones_total: 4,
      milestones_completed: 0
    },
    {
      project_code: 'BVM/RIC/2026/AIML/002',
      title: 'Edge TPU Computer Vision for Real-Time Precision Microgrid & Solar Telemetry',
      department: 'Department of Computer Applications',
      programme: 'BCA (Honours) — Artificial Intelligence & Machine Learning',
      guide_teacher: 'Dr. Mathew Joseph (Associate Professor, Computer Applications)',
      lead_investigator: 'Dr. Mathew Joseph',
      team_members: ['Prof. Thomas K. Abraham', 'Anju Varghese (Student Researcher)'],
      student_team_members: 'Anju Varghese',
      category: 'Innovation',
      status: 'pending',
      abstract: 'Deployment of edge-computing neural accelerators for microsecond thermal anomaly detection in solar photovoltaic arrays and predictive peak load shaving across BVM Holy Cross campus facilities.',
      problem_statement: 'Fluctuating regional power grids and manual solar panel inspection result in substantial thermal degradation losses and unmitigated voltage sags across campus academic blocks.',
      objectives: '1. Quantize MobileNetV3 for Coral Edge TPU.\n2. Stream real-time thermographic telemetry from rooftop drone flights.\n3. Automatically schedule battery discharge cycles during tariff spikes.',
      methodology: 'Edge-embedded inference pipeline on Raspberry Pi 5 with Coral USB Accelerator; local SQLite ring buffer; MQTT telemetry dispatch to central campus dashboard.',
      keywords: 'Edge TPU, Computer Vision, Microgrid, Solar Energy, IoT Telemetry',
      innovation: 'Local microsecond inferencing with zero external cloud dependencies, enabling resilient power management during monsoon grid outages in Kottayam.',
      expected_results: 'Predictive detection of cell micro-cracks with 96% accuracy and an estimated 18% reduction in grid power expenditure during peak daytime demand.',
      expected_outcomes: 'Predictive detection of cell micro-cracks with 96% accuracy and an estimated 18% reduction in grid power expenditure during peak daytime demand.',
      duration_months: 18,
      submitted_date: new Date(now - 2 * day).toISOString(),
      review_deadline: new Date(now + 9 * day).toISOString(),
      last_activity: 'Institutional ethics and safety pre-screening verified; pending committee evaluation',
      ethics_clearance: 'Approved by Institutional Ethics Committee (IEC)',
      milestones_total: 4,
      milestones_completed: 0
    },
    {
      project_code: 'BVM/RIC/2026/COMM/003',
      title: 'UPI FinTech Adoption & Financial Resilience among Kudumbashree Micro-Enterprises',
      department: 'Department of Commerce',
      programme: 'B.Com (Honours) — Finance & Taxation',
      guide_teacher: 'Dr. Antony Thomas (Professor & HOD, Commerce)',
      lead_investigator: 'Dr. Antony Thomas',
      team_members: ['Prof. Biju Cyriac', 'Sneha Kurian (Postgraduate Fellow)'],
      student_team_members: 'Sneha Kurian',
      category: 'Community/Social',
      status: 'approved',
      abstract: 'Comprehensive socio-economic analysis of QR-code payment platforms, digital accounting applications, and micro-loan recovery among 180 Kudumbashree self-help groups in Cherpunkal and Meenachil taluks.',
      problem_statement: 'Despite rapid smartphone penetration, rural women micro-entrepreneurs face digital payment reconciliation hurdles, merchant discount fees, and lack of credit scoring visibility.',
      objectives: '1. Survey 180 neighborhood groups across Cherpunkal panchayat.\n2. Evaluate bookkeeping bottlenecks.\n3. Author a localized Malayalam digital financial literacy framework.',
      methodology: 'Mixed-method quantitative regression and stratified field interviews using structured questionnaires, verified via SPSS and Pearson correlation tests.',
      keywords: 'Kudumbashree, FinTech, Micro-Credit, Financial Inclusion, Rural Economy',
      innovation: 'Introduction of a vernacular audio-assisted micro-ledger model tailored for non-tech-literate rural women artisans and agro-processors.',
      expected_results: 'Policy recommendations for Meenachil block development office and publication in UGC-CARE indexed economics journal.',
      expected_outcomes: 'Policy recommendations for Meenachil block development office and publication in UGC-CARE indexed economics journal.',
      duration_months: 12,
      submitted_date: new Date(now - 30 * day).toISOString(),
      review_deadline: new Date(now - 15 * day).toISOString(),
      last_activity: 'Council approval granted; sanction notification dispatched to Principal office',
      ethics_clearance: 'Approved by Social Research Review Board',
      milestones_total: 4,
      milestones_completed: 1
    },
    {
      project_code: 'BVM/RIC/2026/MSW/004',
      title: 'Decentralized Community Palliative Care Model for Bedridden Elderly in Central Kerala',
      department: 'Department of Social Work',
      programme: 'Master of Social Work (MSW)',
      guide_teacher: 'Dr. Sr. Philo Mary (HOD & Associate Professor, Social Work)',
      lead_investigator: 'Dr. Sr. Philo Mary',
      team_members: ['Prof. Joseph Mathew', 'Meera Chandran (MSW Scholar)'],
      student_team_members: 'Meera Chandran',
      category: 'Community/Social',
      status: 'ongoing',
      abstract: 'Participatory action research establishing a volunteer-driven home-based psycho-social support network for geriatric and terminally ill patients across agrarian villages in Kottayam district.',
      problem_statement: 'Nuclear family shifts and demographic aging in rural Central Kerala have resulted in acute caregiver burnout and social isolation among bedbound geriatric citizens.',
      objectives: '1. Map vulnerable palliative patients in 5 adjacent panchayats.\n2. Train 50 youth community volunteers.\n3. Establish an ongoing emotional support hotline.',
      methodology: 'Community Needs Assessment (CNA) protocol; bio-psycho-social health scales; bi-weekly home visits and caregiver respite programs.',
      keywords: 'Palliative Care, Geriatric Social Work, Community Health, Caregiver Support, Rural Welfare',
      innovation: 'Integration of trained collegiate student volunteers into the local primary healthcare center (PHC) hospice continuum.',
      expected_results: 'Documented palliative welfare manual adopted by local self-government bodies with measurable improvement in patient quality-of-life scores.',
      expected_outcomes: 'Documented palliative welfare manual adopted by local self-government bodies with measurable improvement in patient quality-of-life scores.',
      duration_months: 18,
      submitted_date: new Date(now - 60 * day).toISOString(),
      review_deadline: new Date(now - 45 * day).toISOString(),
      last_activity: 'Milestone 2 community caregiver respite workshops conducted in 3 panchayats',
      ethics_clearance: 'Approved by Institutional Ethics Committee (IEC)',
      milestones_total: 5,
      milestones_completed: 2
    },
    {
      project_code: 'BVM/RIC/2026/VFX/005',
      title: 'Virtual Production & Neural Radiance Field (NeRF) 3D Archival of Cherpunkal Heritage',
      department: 'Department of Animation and Visual Effects',
      programme: 'BA (Honours) Animation and Visual Effects — VFX & Animation Production',
      guide_teacher: 'Prof. Rahul K. Menon (HOD & Assistant Professor, VFX & 3D Animation)',
      lead_investigator: 'Prof. Rahul K. Menon',
      team_members: ['Prof. Deepa Varghese', 'Kiran S. Nair (VFX Student)'],
      student_team_members: 'Kiran S. Nair',
      category: 'Product Development',
      status: 'ongoing',
      abstract: 'Creation of photorealistic real-time virtual production environments and volumetric NeRF captures of historic Meenachil river architectural monuments and Christian heritage landmarks.',
      problem_statement: 'Physical weathering, floods, and modernization threaten historical regional architecture, while traditional photogrammetry struggles with intricate religious woodwork and reflective surfaces.',
      objectives: '1. Capture 4K multi-angle drone and handheld footage.\n2. Train Instant-NGP neural radiance fields.\n3. Integrate digital assets into Unreal Engine 5.4 virtual production sets.',
      methodology: 'Volumetric Gaussian splatting, mesh decimation in Blender, PBR texturing, and LED-volume virtual camera tracking.',
      keywords: 'Virtual Production, NeRF, Unreal Engine 5, Heritage Preservation, 3D VFX',
      innovation: 'Real-time in-camera visual effects (ICVFX) pipeline built with accessible hardware for cultural preservation pedagogy.',
      expected_results: 'Interactive 3D virtual museum accessible via WebGL and a short animated documentary on Central Travancore heritage.',
      expected_outcomes: 'Interactive 3D virtual museum accessible via WebGL and a short animated documentary on Central Travancore heritage.',
      duration_months: 12,
      submitted_date: new Date(now - 45 * day).toISOString(),
      review_deadline: new Date(now - 30 * day).toISOString(),
      last_activity: 'Volumetric camera rigs calibrated in Meenachil riverside heritage sanctuary',
      ethics_clearance: 'Approved by Heritage & Arts Review Board',
      milestones_total: 4,
      milestones_completed: 2
    },
    {
      project_code: 'BVM/RIC/2026/NUTR/006',
      title: 'Formulation and Glycemic Index Evaluation of Low-Cost Jackfruit Seed Nutribars',
      department: 'Department of Clinical Nutrition and Dietetics',
      programme: 'B.Sc. Clinical Nutrition and Dietetics',
      guide_teacher: 'Dr. Mary Scaria (HOD & Professor, Nutrition & Dietetics)',
      lead_investigator: 'Dr. Mary Scaria',
      team_members: ['Prof. Anita Paul', 'Devika R. (Student Researcher)'],
      student_team_members: 'Devika R.',
      category: 'Research',
      status: 'approved',
      abstract: 'Valorization of underutilized Artocarpus heterophyllus (jackfruit) seeds into high-resistant-starch, low-glycemic functional snack bars for diabetic and pre-diabetic adolescent cohorts.',
      problem_statement: 'Over 70% of jackfruit seeds in Kerala are discarded as agri-waste, despite high prebiotic and resistant starch contents that could mitigate escalating adolescent type-2 diabetes rates.',
      objectives: '1. Optimize seed flour extrusion and drying parameters.\n2. Conduct proximate nutritional profiling.\n3. Perform in-vitro enzymatic starch digestion assays.',
      methodology: 'Thermomechanical roasting, standard AOAC proximate analysis, DNS colorimetric assay for reducing sugars, and 9-point hedonic sensory evaluation.',
      keywords: 'Clinical Nutrition, Jackfruit Seed, Resistant Starch, Glycemic Index, Functional Food',
      innovation: 'Zero-added-sugar binding matrix using indigenous palm jaggery, creating a shelf-stable high-fiber nutribar under ₹12 production cost.',
      expected_results: 'Nutrient facts table, microbial shelf-life report over 90 days, and patent filing for functional food formulation.',
      expected_outcomes: 'Nutrient facts table, microbial shelf-life report over 90 days, and patent filing for functional food formulation.',
      duration_months: 9,
      submitted_date: new Date(now - 20 * day).toISOString(),
      review_deadline: new Date(now - 8 * day).toISOString(),
      last_activity: 'Institutional ethics clearance approved; pilot clinical testing commenced',
      ethics_clearance: 'Approved by Human Nutrition Ethics Committee',
      milestones_total: 3,
      milestones_completed: 1
    },
    {
      project_code: 'BVM/RIC/2026/ACT/007',
      title: 'Extreme Precipitation Risk Modeling & Parametric Crop Insurance Index for Rubber Smallholders',
      department: 'Department of Computer Science',
      programme: 'Integrated M.Sc. Computer Science & Actuarial Science',
      guide_teacher: 'Dr. Sangeetha Nair (Professor, Computer Science & AI)',
      lead_investigator: 'Dr. Sangeetha Nair',
      team_members: ['Prof. Arun George', 'Rohan Kuruvilla (PG Actuarial Scholar)'],
      student_team_members: 'Rohan Kuruvilla',
      category: 'Interdisciplinary',
      status: 'completed',
      abstract: 'Stochastic modeling of extreme monsoon rainfall spells in Kottayam to design automated trigger-based parametric payouts protecting smallholder natural rubber farmers from tapping day losses.',
      problem_statement: 'Conventional indemnity-based crop insurance requires prolonged damage surveys, causing claim delays of up to 9 months for rain-affected rubber tappers during monsoon months.',
      objectives: '1. Fit Generalized Pareto Distributions (GPD) to 40-year IMD gridded rainfall data.\n2. Formulate actuarially fair loss ratios.\n3. Backtest automatic smart contract trigger policies.',
      methodology: 'Extreme Value Theory (EVT), Monte Carlo loss simulation, Copula dependency modeling, and spatial downscaling.',
      keywords: 'Actuarial Science, Parametric Insurance, Extreme Value Theory, Climate Risk, Rubber Cultivation',
      innovation: 'Daily millimeter threshold index that settles claim payouts automatically to bank accounts within 48 hours of recorded rainfall surplus.',
      expected_results: 'Complete actuarial pricing model and technical whitepaper submitted to Agricultural Insurance Company of India (AIC).',
      expected_outcomes: 'Complete actuarial pricing model and technical whitepaper submitted to Agricultural Insurance Company of India (AIC).',
      duration_months: 12,
      submitted_date: new Date(now - 120 * day).toISOString(),
      review_deadline: new Date(now - 90 * day).toISOString(),
      last_activity: 'Final research monograph accepted for peer-reviewed indexed journal publication',
      ethics_clearance: 'Approved by Institutional Data Board',
      milestones_total: 4,
      milestones_completed: 4
    },
    {
      project_code: 'BVM/RIC/2026/CS/008',
      title: 'Verifiable Zero-Knowledge Digital Diploma Credentials on Lightweight Ledger',
      department: 'Department of Computer Applications',
      programme: 'Master of Computer Applications (MCA)',
      guide_teacher: 'Prof. Saji K. Varkey (Assistant Professor, Computer Applications)',
      lead_investigator: 'Prof. Saji K. Varkey',
      team_members: ['Rahul S. Nair (Student)', 'Deepa Mohan (PG Scholar)'],
      student_team_members: 'Rahul S. Nair, Deepa Mohan',
      category: 'Product Development',
      status: 'rejected',
      abstract: 'Implementation of zk-SNARK cryptographic proofs for instant, privacy-preserving degree authentication by employers without revealing student cumulative marks or internal grades.',
      problem_statement: 'Paper degree fraud and slow manual embassy verification procedures impose administrative overhead on autonomous colleges and graduating alumni seeking global employment.',
      objectives: '1. Deploy circom zero-knowledge circuit for grade verification.\n2. Generate verifiable QR certificates.\n3. Integrate with college student portal.',
      methodology: 'Groth16 proving system, Poseidon hashing, and mobile-friendly webassembly verification client.',
      keywords: 'Zero-Knowledge Proofs, Cryptography, Credential Verification, MCA, EdTech',
      innovation: 'Allows a graduate to prove GPA > 3.5 or course completion without revealing transcript course details or confidential student ID.',
      expected_results: 'Returned by RIC Council: requested clearer data privacy compliance with Digital Personal Data Protection (DPDP) Act before re-submission.',
      expected_outcomes: 'Returned by RIC Council: requested clearer data privacy compliance with Digital Personal Data Protection (DPDP) Act before re-submission.',
      duration_months: 6,
      submitted_date: new Date(now - 15 * day).toISOString(),
      review_deadline: new Date(now - 5 * day).toISOString(),
      last_activity: 'Returned by RIC Council due to pending DPDP Act compliance clarifications; revisions requested',
      ethics_clearance: 'Not Approved - Privacy review requested',
      milestones_total: 2,
      milestones_completed: 0
    }
  ];
}

// Seed default BVM Holy Cross College projects only into empty stores.
export async function seedDefaultProjectsIfEmpty() {
  const isMongo = isMongoDBConnected();
  const defaultProjects = getDefaultProjects();

  if (isMongo) {
    try {
      const existing = await Project.find();
      if (existing.length === 0) {
        console.log('[ProjectSeed] Seeding BVM Holy Cross College, Cherpunkal projects in MongoDB...');
        await Project.insertMany(defaultProjects.map((project) => ({
          ...project,
          submitted_date: null
        })), { timestamps: false });
        console.log('[ProjectSeed] Seeded default projects for BVM Holy Cross College into MongoDB.');
      }
    } catch (err) {
      console.error('[ProjectSeed] MongoDB seed error:', err.message);
    }
  }

  // Local storage check
  const localProjects = readLocalProjects();
  if (localProjects.length === 0) {
    console.log('[ProjectSeed] Seeding BVM Holy Cross College, Cherpunkal projects in local store...');
    const seeded = defaultProjects.map((p, idx) => ({
      _id: 'bvm_proj_' + Date.now().toString(36) + '_' + idx,
      id: 'bvm_proj_' + Date.now().toString(36) + '_' + idx,
      ...p,
      submitted_date: null
    }));
    writeLocalProjects(seeded);
    console.log('[ProjectSeed] Seeded default BVM Holy Cross College projects into local store.');
  }

  const reported = await backfillSimilarityReports();
  if (reported > 0) {
    console.log(`[ProjectSeed] Saved similarity reports for ${reported} project(s).`);
  }
}

// Dashboard summary derived from records visible to the requesting user.
export async function getDashboardSummary(user = null) {
  let allProjects = [];

  if (isMongoDBConnected()) {
    allProjects = await Project.find().sort({ updatedAt: -1 }).lean();
  } else {
    allProjects = readLocalProjects();
  }

  // Seed defaults only for an empty store; never replace existing project records.
  if (allProjects.length === 0) {
    await seedDefaultProjectsIfEmpty();
    allProjects = isMongoDBConnected() ? await Project.find().sort({ updatedAt: -1 }).lean() : readLocalProjects();
  }

  allProjects = allProjects
    .filter((project) => isVisibleToUser(project, user))
    .map((project) => removePrivateProjectFields(project, user));

  const total = allProjects.length;

  // Unknown and missing statuses remain separate from valid lifecycle states.
  const statusCounts = {
    pending: 0,
    approved: 0,
    changes_requested: 0,
    ongoing: 0,
    completed: 0,
    rejected: 0,
    unknown: 0
  };

  const departmentCounts = {};
  const departmentStatusCounts = {};
  const categoryCounts = {};

  allProjects.forEach((p) => {
    const status = Object.prototype.hasOwnProperty.call(statusCounts, p.status)
      ? p.status
      : 'unknown';
    const dept = p.department || 'Unassigned';
    statusCounts[status]++;

    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    if (!departmentStatusCounts[dept]) {
      departmentStatusCounts[dept] = {
        pending: 0,
        approved: 0,
        changes_requested: 0,
        ongoing: 0,
        completed: 0,
        rejected: 0,
        unknown: 0
      };
    }
    departmentStatusCounts[dept][status]++;

    const cat = p.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Proposals awaiting RIC review (pending status sorted by review deadline)
  const pendingProposals = allProjects
    .filter((p) => p.status === 'pending')
    .sort((a, b) => {
      const aDeadline = getProjectTimestamp(a.review_deadline);
      const bDeadline = getProjectTimestamp(b.review_deadline);
      if (aDeadline === null) return bDeadline === null ? 0 : 1;
      if (bDeadline === null) return -1;
      return aDeadline - bDeadline;
    });

  // Records without a recorded update date are retained, but sort after dated records.
  const sortedRecentlyUpdated = [...allProjects]
    .sort((a, b) => {
      const aUpdated = getProjectTimestamp(a.updatedAt);
      const bUpdated = getProjectTimestamp(b.updatedAt);
      if (aUpdated === null) return bUpdated === null ? 0 : 1;
      if (bUpdated === null) return -1;
      return bUpdated - aUpdated;
    });
  const recentlyUpdated = sortedRecentlyUpdated.slice(0, 8);

  return {
    metrics: {
      total,
      pending: statusCounts.pending,
      approved: statusCounts.approved,
      changes_requested: statusCounts.changes_requested,
      ongoing: statusCounts.ongoing,
      completed: statusCounts.completed,
      rejected: statusCounts.rejected,
      unknown: statusCounts.unknown
    },
    statusCounts,
    departmentStats: Object.entries(departmentCounts).map(([department, count]) => ({
      department,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      statusCounts: departmentStatusCounts[department]
    })),
    categoryStats: Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count
    })),
    pendingProposals,
    recentlyUpdated,
    serverTime: new Date().toISOString()
  };
}

export async function listAllProjects(filter = {}, user = null) {
  let projects = [];
  if (isMongoDBConnected()) {
    let visibilityFilter = {};
    if (user && !isRICUser(user)) {
      if (user.role === 'student') {
        const userDeptRegex = user.department
          ? new RegExp(user.department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '.*'), 'i')
          : null;
        visibilityFilter = {
          $or: [
            { submitted_by: user.id },
            ...(userDeptRegex ? [{ department: userDeptRegex, status: { $in: ['approved', 'ongoing', 'completed'] } }] : [])
          ]
        };
      } else if (['faculty_principal', 'institutional_user'].includes(user.role)) {
        visibilityFilter = { $or: [{ status: 'approved' }, { submitted_by: user.id }] };
      } else {
        visibilityFilter = { status: 'approved' };
      }
    }
    const query = Object.keys(visibilityFilter).length
      ? { $and: [filter, visibilityFilter] }
      : filter;
    projects = await Project.find(query).sort({ createdAt: -1 }).lean();
  } else {
    projects = readLocalProjects();
    projects = projects.filter((p) => {
      if (filter.status && p.status !== filter.status) return false;
      if (filter.department && p.department !== filter.department) return false;
      return isVisibleToUser(p, user);
    });
  }

  return projects.map((project) => removePrivateProjectFields(project, user));
}

export async function createProjectRecord(projectData) {
  if (isMongoDBConnected()) {
    const project = await Project.create(projectData);
    return project.toObject();
  }

  const projects = readLocalProjects();
  if (projects.some((project) => project.project_code === projectData.project_code)) {
    const err = new Error('A project with this code already exists.');
    err.code = 'PROJECT_CODE_CONFLICT';
    throw err;
  }

  const now = new Date().toISOString();
  const project = {
    _id: `project_${randomUUID()}`,
    ...projectData,
    submitted_date: now,
    createdAt: now,
    updatedAt: now
  };
  projects.unshift(project);
  fs.writeFileSync(LOCAL_PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  return project;
}

export async function updateProjectReview(projectId, reviewData) {
  if (isMongoDBConnected()) {
    return Project.findOneAndUpdate(
      { _id: projectId, status: 'pending' },
      { $set: reviewData },
      { new: true, runValidators: true }
    ).lean();
  }

  const projects = readLocalProjects();
  const projectIndex = projects.findIndex((item) => item._id === projectId && item.status === 'pending');
  if (projectIndex === -1) return null;

  const project = applyReviewUpdate(projects[projectIndex], reviewData);
  if (!project) return null;
  projects[projectIndex] = project;
  saveLocalProjects(projects);
  return project;
}

export async function resubmitProjectRecord(projectId, userId, projectData) {
  if (isMongoDBConnected()) {
    return Project.findOneAndUpdate(
      { _id: projectId, submitted_by: userId, status: 'changes_requested' },
      {
        $set: {
          ...projectData,
          status: 'pending',
          submitted_date: new Date(),
          last_activity: 'Revised proposal resubmitted for RIC evaluation',
          review_comment: '',
          reviewed_by: '',
          reviewed_by_name: '',
          reviewed_at: null
        }
      },
      { new: true, runValidators: true }
    ).lean();
  }

  const projects = readLocalProjects();
  const project = projects.find((item) =>
    item._id === projectId &&
    item.submitted_by === userId &&
    item.status === 'changes_requested'
  );
  if (!project) return null;

  Object.assign(project, projectData, {
    status: 'pending',
    submitted_date: new Date().toISOString(),
    last_activity: 'Revised proposal resubmitted for RIC evaluation',
    review_comment: '',
    reviewed_by: '',
    reviewed_by_name: '',
    reviewed_at: null,
    updatedAt: new Date().toISOString()
  });
  saveLocalProjects(projects);
  return project;
}

export async function getProjectRecord(projectId, user) {
  let project = null;
  if (isMongoDBConnected()) {
    project = await Project.findOne({
      $or: [{ _id: projectId }, { project_code: projectId }]
    }).lean();
  } else {
    const projects = readLocalProjects();
    project = projects.find((item) => item._id === projectId || item.project_code === projectId);
  }

  if (!project) return null;
  if (!isVisibleToUser(project, user)) return null;
  return removePrivateProjectFields(project, user);
}

export async function updateProjectRecord(projectId, userId, projectData, user) {
  if (isMongoDBConnected()) {
    const existing = await Project.findOne({
      $or: [{ _id: projectId }, { project_code: projectId }]
    }).lean();
    if (!existing) return { error: 'Project not found.', status: 404 };

    const isRic = isRICUser(user);
    const isOwner = existing.submitted_by === userId;
    if (!isRic && !isOwner) {
      return { error: 'You are not authorized to edit this proposal.', status: 403 };
    }
    if (!isRic && existing.status !== 'pending' && existing.status !== 'changes_requested') {
      return { error: 'Only pending or returned proposals can be edited.', status: 400 };
    }

    const wasChangesRequested = existing.status === 'changes_requested';
    const updatePayload = {
      ...projectData,
      updatedAt: new Date()
    };
    if (wasChangesRequested) {
      updatePayload.status = 'pending';
      updatePayload.last_activity = 'Revised proposal resubmitted for RIC evaluation';
      updatePayload.review_comment = '';
      updatePayload.reviewed_by = '';
      updatePayload.reviewed_by_name = '';
      updatePayload.reviewed_at = null;
    } else {
      updatePayload.last_activity = 'Proposal details updated by researcher';
    }

    const updated = await Project.findOneAndUpdate(
      { _id: existing._id },
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean();
    return { project: removePrivateProjectFields(updated, user) };
  }

  const projects = readLocalProjects();
  const projectIndex = projects.findIndex(
    (item) => item._id === projectId || item.project_code === projectId
  );
  if (projectIndex === -1) return { error: 'Project not found.', status: 404 };

  const existing = projects[projectIndex];
  const isRic = isRICUser(user);
  const isOwner = existing.submitted_by === userId;

  if (!isRic && !isOwner) {
    return { error: 'You are not authorized to edit this proposal.', status: 403 };
  }
  if (!isRic && existing.status !== 'pending' && existing.status !== 'changes_requested') {
    return { error: 'Only pending or returned proposals can be edited.', status: 400 };
  }

  const wasChangesRequested = existing.status === 'changes_requested';
  const now = new Date().toISOString();

  Object.assign(existing, projectData, {
    updatedAt: now
  });

  if (wasChangesRequested) {
    existing.status = 'pending';
    existing.last_activity = 'Revised proposal resubmitted for RIC evaluation';
    existing.review_comment = '';
    existing.reviewed_by = '';
    existing.reviewed_by_name = '';
    existing.reviewed_at = null;
  } else {
    existing.last_activity = 'Proposal details updated by researcher';
  }

  projects[projectIndex] = existing;
  saveLocalProjects(projects);
  return { project: removePrivateProjectFields(existing, user) };
}

export async function deleteProjectRecord(projectId, userId, user) {
  if (isMongoDBConnected()) {
    const existing = await Project.findOne({
      $or: [{ _id: projectId }, { project_code: projectId }]
    }).lean();
    if (!existing) return { error: 'Project not found.', status: 404 };

    const isRic = isRICUser(user);
    const isOwner = existing.submitted_by === userId;
    if (!isRic && !isOwner) {
      return { error: 'You are not authorized to delete this proposal.', status: 403 };
    }
    if (!isRic && existing.status !== 'pending' && existing.status !== 'changes_requested') {
      return { error: 'Only pending or returned proposals can be withdrawn.', status: 400 };
    }

    await Project.deleteOne({ _id: existing._id });
    return { success: true, deletedCode: existing.project_code };
  }

  const projects = readLocalProjects();
  const projectIndex = projects.findIndex(
    (item) => item._id === projectId || item.project_code === projectId
  );
  if (projectIndex === -1) return { error: 'Project not found.', status: 404 };

  const existing = projects[projectIndex];
  const isRic = isRICUser(user);
  const isOwner = existing.submitted_by === userId;

  if (!isRic && !isOwner) {
    return { error: 'You are not authorized to delete this proposal.', status: 403 };
  }
  if (!isRic && existing.status !== 'pending' && existing.status !== 'changes_requested') {
    return { error: 'Only pending or returned proposals can be withdrawn.', status: 400 };
  }

  projects.splice(projectIndex, 1);
  saveLocalProjects(projects);
  return { success: true, deletedCode: existing.project_code };
}

/**
 * Module 6: Assign Proposal to One or More RIC Reviewers
 */
export async function assignProjectReviewers(projectId, assignedReviewers, assigner, user) {
  const activity = `Assigned to ${assignedReviewers.length} RIC reviewer(s) by ${assigner.name}`;
  const now = new Date().toISOString();

  if (isMongoDBConnected()) {
    const existing = await Project.findOne({
      $or: [{ _id: projectId }, { project_code: projectId }]
    });
    if (!existing) return { error: 'Project not found.', status: 404 };

    existing.assigned_reviewers = assignedReviewers;
    existing.last_activity = activity;
    existing.updatedAt = new Date();
    await existing.save();
    return { project: removePrivateProjectFields(existing.toObject(), user) };
  }

  const projects = readLocalProjects();
  const projectIndex = projects.findIndex(
    (item) => item._id === projectId || item.project_code === projectId
  );
  if (projectIndex === -1) return { error: 'Project not found.', status: 404 };

  const existing = projects[projectIndex];
  existing.assigned_reviewers = assignedReviewers;
  existing.last_activity = activity;
  existing.updatedAt = now;

  projects[projectIndex] = existing;
  saveLocalProjects(projects);
  return { project: removePrivateProjectFields(existing, user) };
}

/**
 * Module 6: Submit and Record an Individual RIC Evaluation
 */
export async function addProjectEvaluation(projectId, evaluationData, reviewer, user) {
  const now = new Date().toISOString();
  const activity = `Evaluation recorded by RIC: ${reviewer.name} (${evaluationData.total_score}/100 - ${evaluationData.recommendation})`;

  if (isMongoDBConnected()) {
    const existing = await Project.findOne({
      $or: [{ _id: projectId }, { project_code: projectId }]
    });
    if (!existing) return { error: 'Project not found.', status: 404 };

    const evals = Array.isArray(existing.evaluations) ? existing.evaluations.toObject() : [];
    const existingIndex = evals.findIndex((e) => e.reviewer_id === reviewer.id);
    if (existingIndex >= 0) {
      evals[existingIndex] = evaluationData;
    } else {
      evals.push(evaluationData);
    }

    const summary = computeEvaluationSummary(evals);
    existing.evaluations = evals;
    existing.evaluation_summary = summary;
    existing.last_activity = activity;
    existing.updatedAt = new Date();
    await existing.save();

    return {
      project: removePrivateProjectFields(existing.toObject(), user),
      evaluation: evaluationData,
      summary
    };
  }

  const projects = readLocalProjects();
  const projectIndex = projects.findIndex(
    (item) => item._id === projectId || item.project_code === projectId
  );
  if (projectIndex === -1) return { error: 'Project not found.', status: 404 };

  const existing = projects[projectIndex];
  const evals = Array.isArray(existing.evaluations) ? existing.evaluations : [];
  const existingIndex = evals.findIndex((e) => e.reviewer_id === reviewer.id);
  if (existingIndex >= 0) {
    evals[existingIndex] = evaluationData;
  } else {
    evals.push(evaluationData);
  }

  const summary = computeEvaluationSummary(evals);
  existing.evaluations = evals;
  existing.evaluation_summary = summary;
  existing.last_activity = activity;
  existing.updatedAt = now;

  projects[projectIndex] = existing;
  saveLocalProjects(projects);

  return {
    project: removePrivateProjectFields(existing, user),
    evaluation: evaluationData,
    summary
  };
}

/**
 * Section 8: Guide Review & Proposals Assigned to Guide
 */
export async function listProjectsForGuide(guideUser) {
  const guideId = String(guideUser.id || guideUser._id || '');
  const guideEmail = String(guideUser.email || '').trim().toLowerCase();
  const rawGuideName = String(guideUser.name || '').trim();
  const cleanName = rawGuideName.replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').trim();

  let facultyIds = [guideId];
  let facultyNames = [rawGuideName];
  if (cleanName) facultyNames.push(cleanName);
  let facultyEmails = [guideEmail];

  try {
    const allFaculty = await listFaculty();
    const matched = allFaculty.filter((f) => {
      const fEmail = String(f.email || '').trim().toLowerCase();
      const fName = String(f.name || '').trim().toLowerCase();
      const fClean = fName.replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '').trim();
      return (guideEmail && fEmail === guideEmail) ||
        (cleanName && (fClean.includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(fClean))) ||
        (guideId && (String(f.id) === guideId || String(f._id) === guideId));
    });

    matched.forEach((f) => {
      if (f.id) facultyIds.push(String(f.id));
      if (f._id) facultyIds.push(String(f._id));
      if (f.faculty_id) facultyIds.push(String(f.faculty_id));
      if (f.name) facultyNames.push(String(f.name).trim());
      if (f.email) facultyEmails.push(String(f.email).trim().toLowerCase());
    });
  } catch (err) {
    console.warn('[listProjectsForGuide] Faculty directory lookup note:', err.message);
  }

  facultyIds = [...new Set(facultyIds.filter(Boolean))];
  facultyNames = [...new Set(facultyNames.filter(Boolean))];
  facultyEmails = [...new Set(facultyEmails.filter(Boolean))];

  if (isMongoDBConnected()) {
    const orCriteria = [
      { guide_id: { $in: facultyIds } },
      { lead_faculty_id: { $in: facultyIds } }
    ];
    if (facultyEmails.length > 0) {
      orCriteria.push({ guide_email: { $in: facultyEmails } });
    }
    facultyNames.forEach((n) => {
      const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      orCriteria.push({ guide_name: new RegExp(escaped, 'i') });
      orCriteria.push({ guide_teacher: new RegExp(escaped, 'i') });
      orCriteria.push({ lead_investigator: new RegExp(escaped, 'i') });
    });

    const projects = await Project.find({ $or: orCriteria }).sort({ createdAt: -1 }).lean();
    return projects.map((p) => removePrivateProjectFields(p, guideUser));
  }

  const projects = readLocalProjects();
  const matched = projects.filter((p) => {
    const pGuideId = String(p.guide_id || p.lead_faculty_id || '');
    const pEmail = String(p.guide_email || '').trim().toLowerCase();
    const pNames = [p.guide_name, p.guide_teacher, p.lead_investigator].map((x) => String(x || '').trim().toLowerCase());

    if (pGuideId && facultyIds.includes(pGuideId)) return true;
    if (pEmail && facultyEmails.includes(pEmail)) return true;
    return facultyNames.some((n) => {
      const lower = n.toLowerCase();
      return pNames.some((pName) => pName && (pName.includes(lower) || lower.includes(pName)));
    });
  });
  return matched.map((p) => removePrivateProjectFields(p, guideUser));
}

export async function recordGuideReview(projectId, guideReviewData, user) {
  const isRevision = guideReviewData.status === 'revision_required';
  const newStatus = isRevision ? 'changes_requested' : 'guide_reviewed';
  const activity = isRevision
    ? `Guide review: Revisions requested by ${guideReviewData.reviewer_name}`
    : `Guide review: Recommended for RIC approval by ${guideReviewData.reviewer_name}`;
  const now = new Date().toISOString();

  if (isMongoDBConnected()) {
    const project = await Project.findOne({
      $or: [{ _id: projectId }, { project_code: projectId }]
    });
    if (!project) return { error: 'Project proposal not found.', status: 404 };

    project.guide_review = guideReviewData;
    if (!Array.isArray(project.guide_review_history)) project.guide_review_history = [];
    project.guide_review_history.push(guideReviewData);
    project.status = newStatus;
    project.last_activity = activity;
    if (isRevision) {
      project.review_comment = guideReviewData.comments;
    }
    project.updatedAt = new Date();
    await project.save();
    return { project: removePrivateProjectFields(project.toObject(), user) };
  }

  const projects = readLocalProjects();
  const index = projects.findIndex((p) => p._id === projectId || p.project_code === projectId);
  if (index === -1) return { error: 'Project proposal not found.', status: 404 };

  const project = projects[index];
  project.guide_review = guideReviewData;
  if (!Array.isArray(project.guide_review_history)) project.guide_review_history = [];
  project.guide_review_history.push(guideReviewData);
  project.status = newStatus;
  project.last_activity = activity;
  if (isRevision) {
    project.review_comment = guideReviewData.comments;
  }
  project.updatedAt = now;

  projects[index] = project;
  saveLocalProjects(projects);
  return { project: removePrivateProjectFields(project, user) };
}

/**
 * Section 9: Official RIC Decisions (6 states) & Approval Letter
 */
export async function recordOfficialDecision(projectId, decisionPayload, user) {
  const { official_decision, panel_interview, approval_letter, status, last_activity } = decisionPayload;
  const now = new Date().toISOString();

  if (isMongoDBConnected()) {
    const project = await Project.findOne({
      $or: [{ _id: projectId }, { project_code: projectId }]
    });
    if (!project) return { error: 'Project proposal not found.', status: 404 };

    project.official_decision = official_decision;
    if (panel_interview) {
      project.panel_interview = panel_interview;
    }
    if (!Array.isArray(project.decision_history)) project.decision_history = [];
    project.decision_history.push(official_decision);
    if (approval_letter) {
      project.approval_letter = approval_letter;
    }
    project.status = status;
    project.last_activity = last_activity;
    project.review_comment = official_decision.comments || official_decision.reasons || '';
    project.reviewed_by = user.id || user._id;
    project.reviewed_by_name = user.name;
    project.reviewed_at = new Date();
    project.updatedAt = new Date();
    await project.save();
    return { project: removePrivateProjectFields(project.toObject(), user) };
  }

  const projects = readLocalProjects();
  const index = projects.findIndex((p) => p._id === projectId || p.project_code === projectId);
  if (index === -1) return { error: 'Project proposal not found.', status: 404 };

  const project = projects[index];
  project.official_decision = official_decision;
  if (panel_interview) {
    project.panel_interview = panel_interview;
  }
  if (!Array.isArray(project.decision_history)) project.decision_history = [];
  project.decision_history.push(official_decision);
  if (approval_letter) {
    project.approval_letter = approval_letter;
  }
  project.status = status;
  project.last_activity = last_activity;
  project.review_comment = official_decision.comments || official_decision.reasons || '';
  project.reviewed_by = user.id || user._id;
  project.reviewed_by_name = user.name;
  project.reviewed_at = now;
  project.updatedAt = now;

  projects[index] = project;
  saveLocalProjects(projects);
  return { project: removePrivateProjectFields(project, user) };
}


