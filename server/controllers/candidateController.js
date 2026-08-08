const User = require('../models/User');
const Candidate = require('../models/Candidate');

const ensureCandidateProfile = async (user) => {
  let profile = await Candidate.findOne({ userId: user.id });
  if (!profile) {
    profile = await Candidate.create({
      userId: user.id,
      name: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      title: user.title || '',
      location: user.location || '',
      githubUrl: user.githubUrl || '',
      linkedinUrl: user.linkedinUrl || '',
      technicalSkills: Array.isArray(user.technicalSkills) ? user.technicalSkills : (Array.isArray(user.skills) ? user.skills : []),
      skills: Array.isArray(user.skills) ? user.skills : [],
      summary: user.bio || '',
      experience: Array.isArray(user.experience) ? user.experience : [],
      education: Array.isArray(user.education) ? user.education : [],
      projects: Array.isArray(user.projects) ? user.projects : [],
      extraCurricular: Array.isArray(user.extraCurricular) ? user.extraCurricular : []
    });
  } else {
    // Fill in missing profile fields from user object if candidate record has empty fields
    let updated = false;
    if (!profile.name && user.fullName) { profile.name = user.fullName; updated = true; }
    if (!profile.phone && user.phone) { profile.phone = user.phone; updated = true; }
    if (!profile.title && user.title) { profile.title = user.title; updated = true; }
    if (!profile.location && user.location) { profile.location = user.location; updated = true; }
    if (!profile.githubUrl && user.githubUrl) { profile.githubUrl = user.githubUrl; updated = true; }
    if (!profile.linkedinUrl && user.linkedinUrl) { profile.linkedinUrl = user.linkedinUrl; updated = true; }
    if (!profile.summary && user.bio) { profile.summary = user.bio; updated = true; }
    if ((!profile.technicalSkills || profile.technicalSkills.length === 0) && (user.technicalSkills?.length || user.skills?.length)) {
      profile.technicalSkills = user.technicalSkills || user.skills || [];
      profile.skills = user.skills || user.technicalSkills || [];
      updated = true;
    }
    if ((!profile.experience || profile.experience.length === 0) && user.experience?.length) {
      profile.experience = user.experience;
      updated = true;
    }
    if ((!profile.education || profile.education.length === 0) && user.education?.length) {
      profile.education = user.education;
      updated = true;
    }
    if ((!profile.projects || profile.projects.length === 0) && user.projects?.length) {
      profile.projects = user.projects;
      updated = true;
    }
    if ((!profile.extraCurricular || profile.extraCurricular.length === 0) && user.extraCurricular?.length) {
      profile.extraCurricular = user.extraCurricular;
      updated = true;
    }
    if (profile.email !== user.email) {
      profile.email = user.email;
      updated = true;
    }
    if (updated) {
      await profile.save();
    }
  }

  return profile;
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.userType !== 'candidate') return res.status(403).json({ error: 'Not a candidate account' });

    const profile = await ensureCandidateProfile(user);

    res.json({ profile: { ...profile.toObject(), avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error('Get Candidate Profile Error:', err);
    res.status(500).json({ error: 'Failed to get candidate profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.userType !== 'candidate') return res.status(403).json({ error: 'Not a candidate account' });

    const profile = await ensureCandidateProfile(user);

    const fields = ['name','phone','location','title','summary','skills','technicalSkills','githubUrl','linkedinUrl','experience','education','projects','extraCurricular'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) profile[f] = req.body[f];
    });

    // Sync avatarUrl to User document (not stored on Candidate sub-doc).
    if (req.body.avatarUrl !== undefined) user.avatarUrl = req.body.avatarUrl;

    if (req.body.technicalSkills !== undefined && req.body.skills === undefined) {
      profile.skills = req.body.technicalSkills;
    } else if (req.body.skills !== undefined && req.body.technicalSkills === undefined) {
      profile.technicalSkills = req.body.skills;
    }

    await profile.save();

    // Keep User document in sync for places that read user-level profile fields.
    if (req.body.name !== undefined) user.fullName = req.body.name;
    // Ignore incoming email updates; email must remain account email.
    profile.email = user.email;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.location !== undefined) user.location = req.body.location;
    if (req.body.title !== undefined) user.title = req.body.title;
    if (req.body.summary !== undefined) user.bio = req.body.summary;
    if (req.body.skills !== undefined) user.skills = req.body.skills;
    if (req.body.technicalSkills !== undefined) user.technicalSkills = req.body.technicalSkills;
    if (req.body.githubUrl !== undefined) user.githubUrl = req.body.githubUrl;
    if (req.body.linkedinUrl !== undefined) user.linkedinUrl = req.body.linkedinUrl;
    if (req.body.experience !== undefined) user.experience = req.body.experience;
    if (req.body.education !== undefined) user.education = req.body.education;
    if (req.body.projects !== undefined) user.projects = req.body.projects;
    if (req.body.extraCurricular !== undefined) user.extraCurricular = req.body.extraCurricular;
    if (req.body.technicalSkills !== undefined && req.body.skills === undefined) user.skills = req.body.technicalSkills;
    if (req.body.skills !== undefined && req.body.technicalSkills === undefined) user.technicalSkills = req.body.skills;
    await user.save();

    res.json({ profile: { ...profile.toObject(), avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error('Update Candidate Profile Error:', err);
    res.status(500).json({ error: 'Failed to update candidate profile' });
  }
};

const getProfileById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.userType !== 'candidate') {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const profile = await Candidate.findOne({ userId: user.id });
    if (!profile) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }

    res.json({ profile });
  } catch (err) {
    console.error('Get Candidate Profile By ID Error:', err);
    res.status(500).json({ error: 'Failed to get candidate profile' });
  }
};

module.exports = { getProfile, updateProfile, getProfileById };
