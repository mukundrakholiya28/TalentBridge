require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { createEmbedding } = require("./utils/embedding");

// Models
const User = require("./models/User");
const Candidate = require("./models/Candidate");
const Job = require("./models/Job");
const Application = require("./models/Application");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/talentbridge";

async function seedDatabase() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected");

        console.log("⚠️ Clearing existing demo test data...");
        await User.deleteMany({ email: { $regex: "@demo.com$" } });
        await Candidate.deleteMany({ email: { $regex: "@demo.com$" } });

        // For jobs and applications, we can just delete all of them for a clean slate, 
        // or delete those linked to demo recruiter.
        // For safety, let's just clear all Applications and Jobs to get a fresh test environment
        await Job.deleteMany({});
        await Application.deleteMany({});
        console.log("✅ Cleared demo data");

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash("password123", salt);

        // 1. Create a Recruiter
        const recruiterId = uuidv4();
        const recruiterUser = new User({
            id: recruiterId,
            email: "recruiter@demo.com",
            password,
            fullName: "Demo Recruiter",
            userType: "recruiter"
        });
        await recruiterUser.save();
        console.log("✅ Created Demo Recruiter (recruiter@demo.com / password123)");

        // Create Recruiter profile linked to user
        const RecruiterModel = require('./models/Recruiter');
        const recruiterProfile = new RecruiterModel({ user: recruiterUser._id, name: recruiterUser.fullName, email: recruiterUser.email, companyName: 'Demo Company' });
        await recruiterProfile.save();

        // 2. Create Candidates
        const candidates = [
            {
                email: "frontend@demo.com",
                fullName: "React Specialist",
                skills: ["React", "JavaScript", "TypeScript", "Tailwind CSS"],
                summary: "Passionate frontend developer with 4 years of experience building responsive React applications.",
            },
            {
                email: "backend@demo.com",
                fullName: "Node Backend Expert",
                skills: ["Node.js", "Express", "MongoDB", "Python", "Docker"],
                summary: "Backend systems engineer focusing on scalable APIs and microservices. Strong experience with Node.js and NoSQL databases.",
            },
            {
                email: "ml@demo.com",
                fullName: "Data & ML Engineer",
                skills: ["Python", "TensorFlow", "PyTorch", "SQL", "Pandas"],
                summary: "Machine Learning engineer with a background in mathematics. Expert in training predictive models and working with large datasets.",
            }
        ];

        const savedCandidates = [];
        for (const c of candidates) {
            const uId = uuidv4();

            // Save User
            const user = new User({
                id: uId,
                email: c.email,
                password,
                fullName: c.fullName,
                userType: "candidate"
            });
            await user.save();

            // Generate embedding for Candidate
            const candidateText = `${c.fullName} ${c.skills.join(" ")} ${c.summary}`;
            const embedding = await createEmbedding(candidateText);

            // Save Candidate Profile
            const cand = new Candidate({
                user: user._id,
                name: c.fullName,
                email: c.email,
                skills: c.skills,
                summary: c.summary,
                embedding: embedding
            });
            // Link Candidate profile to its User via user._id
            await cand.save();
            savedCandidates.push({ user, cand });
            console.log(`✅ Created Candidate: ${c.fullName} (${c.email} / password123)`);
        }

        // 3. Create Jobs
        const jobs = [
            {
                title: "Senior React Developer",
                company: "TechNova",
                location: "Remote",
                type: "Full-time",
                description: "We need an expert React developer who understands hooks, context, state management (Redux/Zustand), and performance optimization.",
                requirements: ["React", "JavaScript", "Redux", "CSS"],
                salaryMin: 120000,
                salaryMax: 150000
            },
            {
                title: "Machine Learning Researcher",
                company: "DeepMind",
                location: "London, UK (Hybrid)",
                type: "Full-time",
                description: "Join our AI lab to train large language models. Strong Python foundation and PyTorch experience required.",
                requirements: ["Python", "PyTorch", "Deep Learning", "Mathematics"],
                salaryMin: 150000,
                salaryMax: 200000
            },
            {
                title: "Backend Service Engineer",
                company: "CloudTech",
                location: "San Francisco, CA",
                type: "Contract",
                description: "Building resilient microservices. You must be fluent in Node.js, Express, and understand message queues (RabbitMQ/Kafka).",
                requirements: ["Node.js", "Express", "Microservices", "Docker"],
                salaryMin: 100000,
                salaryMax: 130000
            }
        ];

        const savedJobs = [];
        for (const j of jobs) {
            const jobText = `${j.title} ${j.description} ${j.requirements.join(" ")}`;
            const embedding = await createEmbedding(jobText);

            const job = new Job({
                id: uuidv4(),
                recruiterId: recruiterId, // Linked to the recruiter (legacy string)
                recruiter: recruiterUser._id,
                ...j,
                embedding: embedding
            });
            await job.save();
            savedJobs.push(job);
            console.log(`✅ Created Job: ${j.title}`);
        }

        // 4. Create Applications
        console.log("Submitting test applications...");

        // Frontend candidate applies to React job
        const app1 = new Application({
            id: uuidv4(),
            jobId: savedJobs[0]._id,
            candidateId: savedCandidates[0].user._id,
            recruiterId: recruiterUser._id,
            status: "Pending"
        });
        await app1.save();

        // Backend candidate applies to Service Engineer job
        const app2 = new Application({
            id: uuidv4(),
            jobId: savedJobs[2]._id,
            candidateId: savedCandidates[1].user._id,
            recruiterId: recruiterUser._id,
            status: "In Review"
        });
        await app2.save();

        // ML candidate applies to ML Research job
        const app3 = new Application({
            id: uuidv4(),
            jobId: savedJobs[1]._id,
            candidateId: savedCandidates[2].user._id,
            recruiterId: recruiterUser._id,
            status: "Interview Scheduled"
        });
        await app3.save();

        console.log("✅ Demo data seeded successfully!");

        mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
}

seedDatabase();
