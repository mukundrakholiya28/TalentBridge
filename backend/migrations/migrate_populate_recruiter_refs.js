require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/talentbridge';
  console.log('Connecting to MongoDB...', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('Connected');

  const summary = { jobsScanned: 0, jobsUpdated: 0, candidatesScanned: 0, candidatesUpdated: 0, recruitersScanned: 0, recruitersUpdated: 0 };

  // 1) Populate Job.recruiter from recruiterId -> User._id
  const jobs = await Job.find({ recruiter: { $in: [null, undefined] }, recruiterId: { $exists: true, $ne: null } });
  summary.jobsScanned = jobs.length;
  for (const job of jobs) {
    // try to find the User by its legacy uuid `id` field
    const user = await User.findOne({ id: job.recruiterId });
    if (user) {
      job.recruiter = user._id;
      await job.save();
      summary.jobsUpdated++;
    } else {
      console.warn(`No User found for job ${job._id} recruiterId=${job.recruiterId}`);
    }
  }

  // 2) Ensure Candidate.profile `user` link exists
  const candidates = await Candidate.find({ $or: [{ user: { $exists: false } }, { user: null }] });
  summary.candidatesScanned = candidates.length;
  for (const cand of candidates) {
    let user = null;
    if (cand.email) user = await User.findOne({ email: cand.email });
    if (!user && cand.userId) user = await User.findOne({ id: cand.userId });
    if (!user) {
      // fallback: try matching by name/email variations
      console.warn(`No User found to link Candidate ${cand._id} (email=${cand.email})`);
      continue;
    }
    cand.user = user._id;
    await cand.save();
    summary.candidatesUpdated++;
  }

  // 3) Ensure Recruiter.profile `user` link exists
  const recruiters = await Recruiter.find({ $or: [{ user: { $exists: false } }, { user: null }] });
  summary.recruitersScanned = recruiters.length;
  for (const rec of recruiters) {
    let user = null;
    if (rec.email) user = await User.findOne({ email: rec.email });
    if (!user && rec.userId) user = await User.findOne({ id: rec.userId });
    if (!user) {
      console.warn(`No User found to link Recruiter ${rec._id} (email=${rec.email})`);
      continue;
    }
    rec.user = user._id;
    await rec.save();
    summary.recruitersUpdated++;
  }

  console.log('Migration summary:', summary);
  await mongoose.disconnect();
  console.log('Disconnected. Done.');
}

main().catch(err => {
  console.error('Migration failed', err);
  process.exit(1);
});
