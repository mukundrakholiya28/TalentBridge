const User = require('../models/User');
const Recruiter = require('../models/Recruiter');

const ensureRecruiterProfile = async (user) => {
  let profile = await Recruiter.findOne({ userId: user.id });
  if (!profile) {
    profile = await Recruiter.create({
      userId: user.id,
      name: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      title: user.title || '',
      summary: user.bio || '',
      githubUrl: user.githubUrl || '',
      linkedinUrl: user.linkedinUrl || '',
      companyName: user.companyName || '',
      companyDescription: user.companyDescription || '',
      website: user.portfolioUrl || '',
      location: user.location || '',
      technicalSkills: Array.isArray(user.technicalSkills) ? user.technicalSkills : (Array.isArray(user.skills) ? user.skills : []),
      skills: Array.isArray(user.skills) ? user.skills : [],
      experience: Array.isArray(user.experience) ? user.experience : [],
      education: Array.isArray(user.education) ? user.education : [],
      projects: Array.isArray(user.projects) ? user.projects : [],
      extraCurricular: Array.isArray(user.extraCurricular) ? user.extraCurricular : []
    });
  }

  // Email must always match signed-in account email.
  if (profile.email !== user.email) {
    profile.email = user.email;
    await profile.save();
  }

  return profile;
};

// Get current recruiter's profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.userType !== 'recruiter') return res.status(403).json({ error: 'Not a recruiter account' });

    const profile = await ensureRecruiterProfile(user);

    res.json({ profile: { ...profile.toObject(), avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error('Get Recruiter Profile Error:', err);
    res.status(500).json({ error: 'Failed to get recruiter profile' });
  }
};

// Update current recruiter's profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.userType !== 'recruiter') return res.status(403).json({ error: 'Not a recruiter account' });

    const profile = await ensureRecruiterProfile(user);

    const fields = [
      'name', 'phone', 'title', 'summary', 'githubUrl', 'linkedinUrl',
      'companyName', 'companyDescription', 'website', 'location',
      'skills', 'technicalSkills', 'experience', 'education', 'projects', 'extraCurricular'
    ];
    fields.forEach(f => {
      if (req.body[f] !== undefined) profile[f] = req.body[f];
    });

    // Sync avatarUrl to User document (not stored on Recruiter sub-doc).
    if (req.body.avatarUrl !== undefined) user.avatarUrl = req.body.avatarUrl;

    if (req.body.technicalSkills !== undefined && req.body.skills === undefined) {
      profile.skills = req.body.technicalSkills;
    } else if (req.body.skills !== undefined && req.body.technicalSkills === undefined) {
      profile.technicalSkills = req.body.skills;
    }

    // Ignore incoming email updates; account email is source of truth.
    profile.email = user.email;
    await profile.save();

    // Keep User document synchronized for shared user-level reads.
    if (req.body.name !== undefined) user.fullName = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.title !== undefined) user.title = req.body.title;
    if (req.body.summary !== undefined) user.bio = req.body.summary;
    if (req.body.githubUrl !== undefined) user.githubUrl = req.body.githubUrl;
    if (req.body.linkedinUrl !== undefined) user.linkedinUrl = req.body.linkedinUrl;
    if (req.body.companyName !== undefined) user.companyName = req.body.companyName;
    if (req.body.companyDescription !== undefined) user.companyDescription = req.body.companyDescription;
    if (req.body.website !== undefined) user.portfolioUrl = req.body.website;
    if (req.body.location !== undefined) user.location = req.body.location;
    if (req.body.skills !== undefined) user.skills = req.body.skills;
    if (req.body.technicalSkills !== undefined) user.technicalSkills = req.body.technicalSkills;
    if (req.body.experience !== undefined) user.experience = req.body.experience;
    if (req.body.education !== undefined) user.education = req.body.education;
    if (req.body.projects !== undefined) user.projects = req.body.projects;
    if (req.body.extraCurricular !== undefined) user.extraCurricular = req.body.extraCurricular;
    if (req.body.technicalSkills !== undefined && req.body.skills === undefined) user.skills = req.body.technicalSkills;
    if (req.body.skills !== undefined && req.body.technicalSkills === undefined) user.technicalSkills = req.body.skills;
    await user.save();

    res.json({ profile: { ...profile.toObject(), avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error('Update Recruiter Profile Error:', err);
    res.status(500).json({ error: 'Failed to update recruiter profile' });
  }
};

module.exports = { getProfile, updateProfile };
