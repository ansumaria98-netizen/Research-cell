export const COURSE_CATALOG = Object.freeze([
  {
    key: 'computer-applications',
    department: 'Department of Computer Applications',
    aliases: ['Computer Applications', 'Computer Applications & AI', 'Department of Computer Applications & AI'],
    programmes: [
      {
        name: 'BCA (Honours)',
        specializations: ['Artificial Intelligence', 'Machine Learning', 'Data Science']
      },
      { name: 'MCA', specializations: [] }
    ]
  },
  {
    key: 'business-administration',
    department: 'Department of Business Administration',
    aliases: ['Business Administration'],
    programmes: [{
      name: 'BBA (Honours)',
      specializations: ['Business Analytics', 'Human Resource Management']
    }]
  },
  {
    key: 'animation-visual-effects',
    department: 'Department of Animation and Visual Effects',
    aliases: ['Animation and Visual Effects'],
    programmes: [{
      name: 'BA (Honours) Animation and Visual Effects',
      specializations: ['VFX & Animation Production']
    }]
  },
  {
    key: 'visual-communication',
    department: 'Department of Visual Communication',
    aliases: ['Visual Communication'],
    programmes: [{
      name: 'BA (Honours) Visual Communication',
      specializations: ['Advertisement', 'New Media Journalism']
    }]
  },
  {
    key: 'social-work',
    department: 'Department of Social Work',
    aliases: ['Social Work'],
    programmes: [
      {
        name: 'BSW (Honours)',
        specializations: ['Medical Social Work', 'Psychiatric Social Work', 'Multi-Cultural Social Work']
      },
      { name: 'MSW', specializations: [] }
    ]
  },
  {
    key: 'cyber-forensics',
    department: 'Department of Cyber Forensics',
    aliases: ['Cyber Forensics'],
    programmes: [{
      name: 'B.Sc. (Honours) Cyber Forensics',
      specializations: ['Network Security', 'Operating System Architecture']
    }]
  },
  {
    key: 'clinical-nutrition-dietetics',
    department: 'Department of Clinical Nutrition and Dietetics',
    aliases: ['Clinical Nutrition and Dietetics'],
    programmes: [{ name: 'B.Sc. Clinical Nutrition and Dietetics', specializations: [] }]
  },
  {
    key: 'computer-science',
    department: 'Department of Computer Science',
    aliases: ['Computer Science'],
    programmes: [
      { name: 'B.Sc. Computer Science', specializations: [] },
      {
        name: 'Integrated M.Sc. Computer Science',
        specializations: ['Artificial Intelligence', 'Machine Learning']
      }
    ]
  },
  {
    key: 'commerce',
    department: 'Department of Commerce',
    aliases: ['Commerce'],
    programmes: [{
      name: 'B.Com (Honours)',
      specializations: ['Finance & Taxation', 'Accounting', 'Logistics Management', 'Financial Markets']
    }]
  }
]);

export const UNASSIGNED_PROGRAMMES = Object.freeze([
  'B.Sc. Statistics',
  'M.Sc. Actuarial Science'
]);

function normalizedName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function reconcileCourseCatalogDepartments(existingDepartments = []) {
  const departments = existingDepartments.map((department) => ({ ...department }));

  COURSE_CATALOG.forEach((catalogEntry) => {
    const alreadyLinked = departments.some((department) =>
      department.course_catalog_key === catalogEntry.key
    );
    if (alreadyLinked) return;

    const acceptedNames = new Set([
      catalogEntry.department,
      ...catalogEntry.aliases
    ].map(normalizedName));
    const existing = departments.find((department) =>
      acceptedNames.has(normalizedName(department.name)) &&
      !department.course_catalog_key
    );
    if (existing) {
      existing.course_catalog_key = catalogEntry.key;
      return;
    }

    const nameAlreadyUsed = departments.some((department) =>
      acceptedNames.has(normalizedName(department.name))
    );
    if (!nameAlreadyUsed) {
      departments.push({
        name: catalogEntry.department,
        code: '',
        course_catalog_key: catalogEntry.key
      });
    }
  });

  return departments;
}

export function attachCourseProgrammes(department) {
  const catalogEntry = COURSE_CATALOG.find((item) =>
    item.key === department.course_catalog_key
  );
  return {
    ...department,
    programmes: catalogEntry
      ? catalogEntry.programmes.map((programme) => ({
        ...programme,
        specializations: [...programme.specializations]
      }))
      : []
  };
}
