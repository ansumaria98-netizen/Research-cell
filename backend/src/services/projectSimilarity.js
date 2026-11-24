export const SIMILARITY_THRESHOLD = 25;

export const SIMILARITY_ADVISORY_NOTICE =
  'Advisory support for human review; never reject a project automatically.';

const STOP_WORDS = new Set([
  'and', 'are', 'for', 'from', 'into', 'its', 'our', 'that', 'the', 'their',
  'this', 'through', 'using', 'with', 'within', 'will', 'which', 'who',
  'also', 'been', 'have', 'more', 'such', 'than', 'them', 'these', 'they'
]);

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDepartment(value) {
  return cleanText(value).replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function getAbstractText(project) {
  if (!project || typeof project !== 'object') return '';
  return [project.abstract, project.problem_statement, project.description]
    .map(cleanText)
    .filter(Boolean)
    .join(' ');
}

export function getObjectivesText(project) {
  if (!project || typeof project !== 'object') return '';
  return cleanText(project.objectives);
}

export function getMethodsText(project) {
  if (!project || typeof project !== 'object') return '';
  return [project.methodology, project.methods]
    .map(cleanText)
    .filter(Boolean)
    .join(' ');
}

export function getKeywordsText(project) {
  if (!project || typeof project !== 'object') return '';
  return cleanText(project.keywords);
}

export function getResultsText(project) {
  if (!project || typeof project !== 'object') return '';
  return [project.expected_results, project.expected_outcomes]
    .map(cleanText)
    .filter(Boolean)
    .join(' ');
}

function tokenize(value) {
  const tokens = value.toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  return tokens.filter((token) => !STOP_WORDS.has(token));
}

function vectorize(value) {
  const terms = tokenize(value);
  const vector = new Map();

  terms.forEach((term) => vector.set(term, (vector.get(term) || 0) + 1));
  for (let index = 0; index < terms.length - 1; index++) {
    const bigram = `${terms[index]}_${terms[index + 1]}`;
    vector.set(bigram, (vector.get(bigram) || 0) + 1.5);
  }
  return vector;
}

export function cosineSimilarity(left, right) {
  const leftClean = cleanText(left);
  const rightClean = cleanText(right);
  if (!leftClean || !rightClean) return 0;

  const leftVector = vectorize(leftClean);
  const rightVector = vectorize(rightClean);
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  leftVector.forEach((value, term) => {
    leftMagnitude += value * value;
    dotProduct += value * (rightVector.get(term) || 0);
  });
  rightVector.forEach((value) => {
    rightMagnitude += value * value;
  });

  if (!leftMagnitude || !rightMagnitude) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function extractCommonTerms(leftText, rightText, maxTerms = 8) {
  const leftTokens = new Set((cleanText(leftText).toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((t) => !STOP_WORDS.has(t)));
  const rightTokens = new Set((cleanText(rightText).toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((t) => !STOP_WORDS.has(t)));
  const common = [];
  leftTokens.forEach((t) => {
    if (rightTokens.has(t) && !common.includes(t)) {
      common.push(t);
    }
  });
  return common.slice(0, maxTerms);
}

/**
 * Module 5: Multi-dimensional AI Project Similarity Checker
 * Compares:
 * 1. titles
 * 2. abstracts (including problem statement)
 * 3. objectives
 * 4. methods (methodology)
 * 5. keywords
 * 6. expected results (including expected outcomes)
 */
export function getSimilarityDetails(project, candidate) {
  project = project && typeof project === 'object' ? project : {};
  candidate = candidate && typeof candidate === 'object' ? candidate : {};

  const titleAvailable = Boolean(cleanText(project.title) && cleanText(candidate.title));
  const abstractAvailable = Boolean(getAbstractText(project) && getAbstractText(candidate));
  const objectivesAvailable = Boolean(getObjectivesText(project) && getObjectivesText(candidate));
  const methodsAvailable = Boolean(getMethodsText(project) && getMethodsText(candidate));
  const keywordsAvailable = Boolean(getKeywordsText(project) && getKeywordsText(candidate));
  const resultsAvailable = Boolean(getResultsText(project) && getResultsText(candidate));

  const titleScore = titleAvailable
    ? cosineSimilarity(cleanText(project.title), cleanText(candidate.title))
    : null;
  const abstractScore = abstractAvailable
    ? cosineSimilarity(getAbstractText(project), getAbstractText(candidate))
    : null;
  const objectivesScore = objectivesAvailable
    ? cosineSimilarity(getObjectivesText(project), getObjectivesText(candidate))
    : null;
  const methodsScore = methodsAvailable
    ? cosineSimilarity(getMethodsText(project), getMethodsText(candidate))
    : null;
  const keywordsScore = keywordsAvailable
    ? cosineSimilarity(getKeywordsText(project), getKeywordsText(candidate))
    : null;
  const resultsScore = resultsAvailable
    ? cosineSimilarity(getResultsText(project), getResultsText(candidate))
    : null;

  const presentFields = [];
  if (titleScore !== null) presentFields.push({ name: 'title', score: titleScore, weight: 0.20 });
  if (abstractScore !== null) presentFields.push({ name: 'abstract', score: abstractScore, weight: 0.20 });
  if (objectivesScore !== null) presentFields.push({ name: 'objectives', score: objectivesScore, weight: 0.15 });
  if (methodsScore !== null) presentFields.push({ name: 'methods', score: methodsScore, weight: 0.15 });
  if (keywordsScore !== null) presentFields.push({ name: 'keywords', score: keywordsScore, weight: 0.15 });
  if (resultsScore !== null) presentFields.push({ name: 'results', score: resultsScore, weight: 0.15 });

  if (presentFields.length === 0) {
    return {
      score: 0,
      title_score: null,
      abstract_score: null,
      objectives_score: null,
      methods_score: null,
      keywords_score: null,
      results_score: null,
      match_cue: '',
      common_terms: [],
      breakdown: {
        titles: null,
        abstracts: null,
        objectives: null,
        methods: null,
        keywords: null,
        expected_results: null
      }
    };
  }

  let compositeScore = 0;
  if (presentFields.length === 2 && titleScore !== null && abstractScore !== null) {
    // Preserve exact baseline weights for title + abstract comparisons
    compositeScore = titleScore * 0.6 + abstractScore * 0.4;
  } else if (presentFields.length === 1) {
    compositeScore = presentFields[0].score;
  } else {
    const totalWeight = presentFields.reduce((sum, f) => sum + f.weight, 0);
    compositeScore = presentFields.reduce((sum, f) => sum + f.score * (f.weight / totalWeight), 0);
  }

  const cues = [];
  if (titleScore > 0) cues.push('title terms overlap');
  if (abstractScore > 0) cues.push('abstract/description terms overlap');
  if (objectivesScore > 0) cues.push('objectives terms overlap');
  if (methodsScore > 0) cues.push('methods/methodology terms overlap');
  if (keywordsScore > 0) cues.push('keywords overlap');
  if (resultsScore > 0) cues.push('expected results overlap');

  // Extract shared domain vocabulary across all available texts
  const projectCombined = [
    project.title,
    getAbstractText(project),
    getObjectivesText(project),
    getMethodsText(project),
    getKeywordsText(project),
    getResultsText(project)
  ].join(' ');

  const candidateCombined = [
    candidate.title,
    getAbstractText(candidate),
    getObjectivesText(candidate),
    getMethodsText(candidate),
    getKeywordsText(candidate),
    getResultsText(candidate)
  ].join(' ');

  const commonTerms = extractCommonTerms(projectCombined, candidateCombined);

  return {
    score: Math.round(compositeScore * 100),
    title_score: titleScore === null ? null : Math.round(titleScore * 100),
    abstract_score: abstractScore === null ? null : Math.round(abstractScore * 100),
    objectives_score: objectivesScore === null ? null : Math.round(objectivesScore * 100),
    methods_score: methodsScore === null ? null : Math.round(methodsScore * 100),
    keywords_score: keywordsScore === null ? null : Math.round(keywordsScore * 100),
    results_score: resultsScore === null ? null : Math.round(resultsScore * 100),
    match_cue: cues.length ? cues.join(' and ') : 'no shared terms across compared fields',
    common_terms: commonTerms,
    breakdown: {
      titles: titleScore === null ? null : Math.round(titleScore * 100),
      abstracts: abstractScore === null ? null : Math.round(abstractScore * 100),
      objectives: objectivesScore === null ? null : Math.round(objectivesScore * 100),
      methods: methodsScore === null ? null : Math.round(methodsScore * 100),
      keywords: keywordsScore === null ? null : Math.round(keywordsScore * 100),
      expected_results: resultsScore === null ? null : Math.round(resultsScore * 100)
    }
  };
}

export function findSameDepartmentMatches(candidate, projects, options = {}) {
  candidate = candidate && typeof candidate === 'object' ? candidate : {};
  const department = normalizeDepartment(candidate.department);
  const settings = options && typeof options === 'object' ? options : {};
  const allDepartments = Boolean(settings.allDepartments);

  const hasCandidateText = Boolean(
    cleanText(candidate.title) ||
    getAbstractText(candidate) ||
    getObjectivesText(candidate) ||
    getMethodsText(candidate) ||
    getKeywordsText(candidate) ||
    getResultsText(candidate)
  );

  if ((!department && !allDepartments) || !hasCandidateText || !Array.isArray(projects)) {
    return [];
  }

  const excludedId = settings.excludeProjectId;
  const threshold = Number.isFinite(settings.threshold) ? settings.threshold : SIMILARITY_THRESHOLD;
  const limit = Number.isInteger(settings.limit) && settings.limit > 0 ? settings.limit : 8;

  return projects
    .filter((project) => {
      if (!project) return false;
      if (allDepartments) return true;
      return normalizeDepartment(project.department) === department;
    })
    .filter((project) => !excludedId || String(project._id) !== String(excludedId))
    .map((project) => {
      const details = getSimilarityDetails(project, candidate);
      return {
        project_code: project.project_code,
        title: project.title,
        department: project.department,
        programme: project.programme || '',
        guide_teacher: project.guide_teacher || project.lead_investigator || '',
        lead_investigator: project.lead_investigator || project.guide_teacher || '',
        category: project.category || 'Research',
        status: project.status,
        submitted_date: project.submitted_date || null,
        ...details
      };
    })
    .filter((match) => match.score >= threshold)
    .sort((left, right) => right.score - left.score || String(left.project_code).localeCompare(String(right.project_code)))
    .slice(0, limit);
}

/**
 * Builds the report stored on a proposal.
 * The report is advisory only: it never carries a review status or a rejection.
 */
export function createSimilarityReport(candidate, projects, options = {}) {
  const matches = findSameDepartmentMatches(candidate, projects, options);
  return {
    similarity_matches: matches,
    similarity_score: matches.length ? matches[0].score : 0,
    similarity_checked_at: new Date().toISOString(),
    similarity_notice: SIMILARITY_ADVISORY_NOTICE,
    automatic_rejection: false
  };
}
