function chunkResume(structuredResume) {

  const chunks = [];

  if (structuredResume.summary) {
    chunks.push({
      type: "summary",
      text: structuredResume.summary
    });
  }

  if (structuredResume.skills) {
    chunks.push({
      type: "skills",
      text: structuredResume.skills.join(", ")
    });
  }

  if (structuredResume.experience) {

    structuredResume.experience.forEach(exp => {

      chunks.push({
        type: "experience",
        text: `${exp.title} at ${exp.company}. ${exp.description}`
      });

    });

  }

  if (structuredResume.education) {

    structuredResume.education.forEach(edu => {

      chunks.push({
        type: "education",
        text: `${edu.degree} from ${edu.institution}`
      });

    });

  }

  if (structuredResume.projects) {
    structuredResume.projects.forEach(project => {
      chunks.push({
        type: "project",
        text: `${project.name || project.project || "Project"}: ${project.description || ""}`.trim()
      });
    });
  }

  return chunks;

}

module.exports = { chunkResume };
