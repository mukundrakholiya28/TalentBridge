require("dotenv").config();
const bcrypt = require("bcryptjs");
const { randomUUID: uuidv4 } = require("crypto");
const { createEmbedding } = require("./utils/embedding");

// Supabase Models
const User = require("./models/User");
const Candidate = require("./models/Candidate");
const Recruiter = require("./models/Recruiter");
const Job = require("./models/Job");
const Application = require("./models/Application");

async function seedDatabase() {
    try {
        console.log("🌱 Seeding Supabase database...");

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash("password123", salt);

        // 1. Create Recruiter
        const recruiterId = uuidv4();
        const recruiterUser = await User.create({
            id: recruiterId,
            email: "recruiter@demo.com",
            password,
            fullName: "Demo Recruiter",
            userType: "recruiter"
        });
        console.log("✅ Created Demo Recruiter (recruiter@demo.com / password123)");

        const recruiterProfile = await Recruiter.create({
            userId: recruiterUser.id,
            name: recruiterUser.fullName,
            email: recruiterUser.email,
            companyName: "Demo Company"
        });

        // 2. Create Candidates
        const candidatesData = [
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
        for (const c of candidatesData) {
            const uId = uuidv4();
            const user = await User.create({
                id: uId,
                email: c.email,
                password,
                fullName: c.fullName,
                userType: "candidate"
            });

            const candidateText = `${c.fullName} ${c.skills.join(" ")} ${c.summary}`;
            const embedding = await createEmbedding(candidateText);

            const cand = await Candidate.create({
                userId: user.id,
                name: c.fullName,
                email: c.email,
                skills: c.skills,
                summary: c.summary,
                embedding: embedding
            });

            savedCandidates.push({ user, cand });
            console.log(`✅ Created Candidate: ${c.fullName} (${c.email} / password123)`);
        }

        // 3. Create Jobs
        const jobsData = [
            {
                title: "Senior React Developer",
                company: "TechNova",
                location: "Remote",
                type: "Full-time",
                description: "We need an expert React developer who understands hooks, context, state management, and performance optimization.",
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
                description: "Building resilient microservices. You must be fluent in Node.js, Express, and understand message queues.",
                requirements: ["Node.js", "Express", "Microservices", "Docker"],
                salaryMin: 100000,
                salaryMax: 130000
            }
        ];

        const savedJobs = [];
        for (const j of jobsData) {
            const jobText = `${j.title} ${j.description} ${j.requirements.join(" ")}`;
            const embedding = await createEmbedding(jobText);

            const job = await Job.create({
                jobCode: uuidv4().slice(0, 8),
                recruiterId: recruiterUser.id,
                ...j,
                embedding: embedding
            });
            savedJobs.push(job);
            console.log(`✅ Created Job: ${j.title}`);
        }

        // 4. Create Applications
        console.log("Submitting test applications...");

        await Application.create({
            jobId: savedJobs[0].id,
            candidateId: savedCandidates[0].user.id,
            recruiterId: recruiterUser.id,
            status: "Pending"
        });

        await Application.create({
            jobId: savedJobs[2].id,
            candidateId: savedCandidates[1].user.id,
            recruiterId: recruiterUser.id,
            status: "In Review"
        });

        await Application.create({
            jobId: savedJobs[1].id,
            candidateId: savedCandidates[2].user.id,
            recruiterId: recruiterUser.id,
            status: "Interview Scheduled"
        });

        console.log("✅ Demo data seeded into Supabase successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
}

seedDatabase();
