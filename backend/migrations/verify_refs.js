require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/talentbridge';
  await mongoose.connect(mongoUri);

  const totalJobs = await Job.countDocuments();
  const jobsWithRecruiter = await Job.countDocuments({ recruiter: { $ne: null } });
  const jobsWithoutRecruiter = await Job.countDocuments({ $or: [{ recruiter: null }, { recruiter: { $exists: false } }] });
  const sampleJobsWithout = await Job.find({ $or: [{ recruiter: null }, { recruiter: { $exists: false } }] }).limit(5).lean();

  const totalCandidates = await Candidate.countDocuments();
  const candidatesMissingUser = await Candidate.countDocuments({ $or: [{ user: null }, { user: { $exists: false } }] });
  const sampleCandidatesMissing = await Candidate.find({ $or: [{ user: null }, { user: { $exists: false } }] }).limit(5).lean();

  const totalRecruiters = await Recruiter.countDocuments();
  const recruitersMissingUser = await Recruiter.countDocuments({ $or: [{ user: null }, { user: { $exists: false } }] });
  const sampleRecruitersMissing = await Recruiter.find({ $or: [{ user: null }, { user: { $exists: false } }] }).limit(5).lean();

  console.log(JSON.stringify({
    jobs: { total: totalJobs, withRecruiter: jobsWithRecruiter, withoutRecruiter: jobsWithoutRecruiter, sampleWithout: sampleJobsWithout.map(j => ({ _id: j._id, id: j.id, recruiterId: j.recruiterId })) },
    candidates: { total: totalCandidates, missingUser: candidatesMissingUser, sampleMissing: sampleCandidatesMissing.map(c => ({ _id: c._id, email: c.email, userId: c.userId })) },
    recruiters: { total: totalRecruiters, missingUser: recruitersMissingUser, sampleMissing: sampleRecruitersMissing.map(r => ({ _id: r._id, email: r.email, userId: r.userId })) }
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
