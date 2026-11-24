// IRIPGMS API Client (Vanilla JS - No Bundler Needed)
const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('iripgms_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

const api = {
  // MODULE 1: AUTHENTICATION & ACCESS CONTROL
  async register(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    return data;
  },

  async getGoogleConfig() {
    const res = await fetch(`${API_BASE}/auth/google/config`);
    return res.json();
  },

  async getGoogleAuthUrl() {
    const res = await fetch(`${API_BASE}/auth/google/url`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to get Google login URL');
    }
    return data.url;
  },

  async loginWithGoogle(credential) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Google login failed');
    }
    return data;
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send password reset code');
    }
    return data;
  },

  async resetPassword(email, code, new_password) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, new_password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Session expired');
    }
    return data.user;
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('iripgms_token');
      localStorage.removeItem('iripgms_user');
    }
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch users');
    }
    return data.users;
  },

  async createUser(userData) {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user');
    }
    return data;
  },

  async updateUserStatus(id, isActive) {
    const res = await fetch(`${API_BASE}/auth/users/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: isActive })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user status');
    }
    return data;
  },

  async deleteUser(id) {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }
    return data;
  },

  async getSystemStatus() {
    const res = await fetch(`${API_BASE}/auth/system-status`);
    return await res.json();
  },

  // MODULE 2: DASHBOARD
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load dashboard statistics');
    }
    return data;
  },

  async getDashboardProjects() {
    const res = await fetch(`${API_BASE}/dashboard/projects`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load dashboard projects');
    }
    return data.projects;
  },

  async getDepartments() {
    const res = await fetch(`${API_BASE}/institution/departments`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load departments');
    return {
      departments: data.departments,
      unassignedProgrammes: data.unassignedProgrammes || []
    };
  },

  async getPermittedFaculty() {
    const res = await fetch(`${API_BASE}/institution/faculty`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load permitted faculty');
    return data.faculty;
  },

  async getDepartmentSummary() {
    const res = await fetch(`${API_BASE}/institution/summary`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load department summaries');
    return data;
  },

  async saveDepartment(department, id = '') {
    const res = await fetch(`${API_BASE}/institution/departments${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(department)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save department');
    return data.department;
  },

  async savePermittedFaculty(person, id = '') {
    const res = await fetch(`${API_BASE}/institution/faculty${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(person)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save faculty record');
    return data.faculty;
  },

  async createProject(projectData) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register project');
    }
    return data;
  },

  async getProject(projectId) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load project details');
    }
    return data.project;
  },

  async updateProject(projectId, projectData) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update project proposal');
    }
    return data;
  },

  async deleteProject(projectId) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to withdraw project proposal');
    }
    return data;
  },

  async checkProjectSimilarity(projectData) {
    const res = await fetch(`${API_BASE}/projects/similarity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to check project similarity');
    }
    return data;
  },

  async reviewProject(projectId, decision, comment) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/review`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ decision, comment })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save project review');
    }
    return data;
  },

  async resubmitProject(projectId, projectData) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/resubmit`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to resubmit project');
    }
    return data;
  },

  // MODULE 6: PROJECT REVIEW AND EVALUATION
  async getEvaluationCriteria() {
    const res = await fetch(`${API_BASE}/projects/criteria/rubric`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch evaluation criteria');
    }
    return data;
  },

  async getCommitteeReviewers() {
    const res = await fetch(`${API_BASE}/projects/committee/reviewers`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch committee reviewers');
    }
    return data.reviewers || [];
  },

  async assignReviewers(projectId, reviewerIds) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/assign-reviewers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reviewer_ids: reviewerIds })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to assign reviewers');
    }
    return data;
  },

  async submitEvaluation(projectId, evaluationData) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/evaluate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(evaluationData)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit evaluation');
    }
    return data;
  },

  async getProjectEvaluations(projectId) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/evaluations`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load project evaluations');
    }
    return data;
  },

  // SECTION 4: MASTER COURSE CATALOG
  async getCourses(departmentId = '') {
    const query = departmentId ? `?department_id=${encodeURIComponent(departmentId)}` : '';
    const res = await fetch(`${API_BASE}/institution/courses${query}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load courses');
    return data.courses || [];
  },

  async saveCourse(courseData, id = '') {
    const res = await fetch(`${API_BASE}/institution/courses${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(courseData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save course');
    return data.course;
  },

  // SECTION 5: GUIDE ALLOCATION & CAPACITY
  async getGuides(departmentId = '') {
    const query = departmentId ? `?department_id=${encodeURIComponent(departmentId)}` : '';
    const res = await fetch(`${API_BASE}/institution/guides${query}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load guides');
    return data.guides || [];
  },

  async updateGuideCapacity(facultyId, capacity) {
    const res = await fetch(`${API_BASE}/institution/guides/${encodeURIComponent(facultyId)}/capacity`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ capacity })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update guide capacity');
    return data.guide;
  },

  async allocateGuide(allocationData) {
    const res = await fetch(`${API_BASE}/institution/guides/allocate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(allocationData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to allocate guide');
    return data;
  },

  // SECTION 8: GUIDE REVIEW MODULE
  async getAssignedGuideProposals() {
    const res = await fetch(`${API_BASE}/projects/guide/assigned`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load assigned guide proposals');
    return data.projects || [];
  },

  async submitGuideReview(projectId, reviewData) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/guide-review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record guide review');
    return data;
  },

  // SECTION 9: OFFICIAL RIC DECISIONS & APPROVAL LETTER
  async getDecisionStates() {
    const res = await fetch(`${API_BASE}/projects/decisions/states`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load decision states');
    return data;
  },

  async submitOfficialDecision(projectId, decisionData) {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/official-decision`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(decisionData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record official decision');
    return data;
  }
};

window.api = api;
