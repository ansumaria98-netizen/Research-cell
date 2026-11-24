(function (global) {
  function getDepartmentName(project) {
    return typeof project.department === 'string' && project.department.trim()
      ? project.department.trim()
      : 'Unassigned';
  }

  function groupProjectsByDepartment(projects) {
    if (!Array.isArray(projects)) return [];

    const groups = new Map();
    projects.forEach((project) => {
      const department = getDepartmentName(project);
      if (!groups.has(department)) groups.set(department, []);
      groups.get(department).push(project);
    });

    return [...groups.entries()]
      .map(([department, departmentProjects]) => ({
        department,
        count: departmentProjects.length,
        hasPendingReview: departmentProjects.some((project) => project.status === 'pending'),
        projects: [...departmentProjects].sort((left, right) =>
          Number(right.status === 'pending') - Number(left.status === 'pending')
        )
      }))
      .sort((left, right) =>
        Number(right.hasPendingReview) - Number(left.hasPendingReview) ||
        left.department.localeCompare(right.department)
      )
      .map(({ hasPendingReview, ...group }) => group);
  }

  function getProjectCounts(projects) {
    if (!Array.isArray(projects)) return { total: 0, awaitingRicReview: 0 };
    return {
      total: projects.length,
      awaitingRicReview: projects.filter((project) => project.status === 'pending').length
    };
  }

  global.dashboardUtils = { groupProjectsByDepartment, getProjectCounts };
})(globalThis);
