const cosineSimilarity = (vecA, vecB) => {

  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};



const calculateSkillMatch = (candidateSkills, jobSkills) => {

  if (!candidateSkills || !jobSkills) return 0;

  const candidateSet = new Set(candidateSkills.map(s => s.toLowerCase()));

  let matched = 0;

  jobSkills.forEach(skill => {
    if (candidateSet.has(skill.toLowerCase())) {
      matched++;
    }
  });

  return matched / jobSkills.length;
};



const calculateExperienceMatch = (candidateExperience, jobRequirements) => {

  if (!candidateExperience || !jobRequirements) return 0;

  let score = 0;

  candidateExperience.forEach(exp => {

    const description = (exp.description || "").toLowerCase();

    jobRequirements.forEach(req => {

      if (description.includes(req.toLowerCase())) {
        score++;
      }

    });

  });

  return Math.min(score / 10, 1);
};



const calculateEducationMatch = (educationList, jobDescription) => {

  if (!educationList || !jobDescription) return 0;

  const description = jobDescription.toLowerCase();

  let score = 0;

  educationList.forEach(edu => {

    const degree = (edu.degree || "").toLowerCase();

    if (description.includes(degree)) {
      score += 1;
    }

  });

  return Math.min(score / 2, 1);
};



const calculateCandidateScore = (candidate, job) => {

  const semanticScore = cosineSimilarity(candidate.embedding, job.embedding);

  const skillScore = calculateSkillMatch(candidate.skills, job.requirements);

  const experienceScore = calculateExperienceMatch(candidate.experience, job.requirements);

  const educationScore = calculateEducationMatch(candidate.education, job.description);

  const finalScore =
    semanticScore * 0.4 +
    skillScore * 0.3 +
    experienceScore * 0.2 +
    educationScore * 0.1;

  return {
    finalScore: Number((finalScore * 100).toFixed(2)),
    breakdown: {
      semanticSimilarity: semanticScore,
      skillMatch: skillScore,
      experienceMatch: experienceScore,
      educationMatch: educationScore
    }
  };
};



module.exports = {
  calculateCandidateScore
};