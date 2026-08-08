-- TalentBridge Supabase PostgreSQL Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    password TEXT,
    user_type TEXT NOT NULL CHECK (user_type IN ('candidate', 'recruiter')),
    full_name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    avatar_url TEXT,
    google_data JSONB DEFAULT '{}'::jsonb,
    google JSONB DEFAULT '{}'::jsonb,
    location TEXT,
    resume_url TEXT,
    skills TEXT[] DEFAULT '{}',
    bio TEXT,
    experience JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    extra_curricular TEXT[] DEFAULT '{}',
    technical_skills TEXT[] DEFAULT '{}',
    github_url TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    title TEXT,
    location TEXT,
    technical_skills TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    experience JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    extra_curricular TEXT[] DEFAULT '{}',
    summary TEXT,
    resume_text TEXT DEFAULT '',
    resume_path TEXT,
    embedding FLOAT8[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Recruiters Table
CREATE TABLE IF NOT EXISTS recruiters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    title TEXT,
    summary TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    company_name TEXT,
    company_description TEXT,
    website TEXT,
    location TEXT,
    technical_skills TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    experience JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    extra_curricular TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_code TEXT NOT NULL,
    recruiter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    type TEXT,
    description TEXT,
    requirements TEXT[] DEFAULT '{}',
    benefits TEXT[] DEFAULT '{}',
    salary_min NUMERIC,
    salary_max NUMERIC,
    skills TEXT[] DEFAULT '{}',
    experience_required INT DEFAULT 0,
    education TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    embedding FLOAT8[] DEFAULT '{}',
    is_open BOOLEAN DEFAULT TRUE,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recruiter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    portfolio TEXT,
    linkedin TEXT,
    available_from TIMESTAMPTZ,
    resume_file_name TEXT,
    status TEXT DEFAULT 'Pending',
    status_history JSONB DEFAULT '[]'::jsonb,
    interview_link TEXT DEFAULT '',
    interview_date TIMESTAMPTZ,
    interview_type TEXT DEFAULT 'video',
    assessment_link TEXT DEFAULT '',
    assessment_due_date TIMESTAMPTZ,
    assessment_title TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Offers Table
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recruiter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    salary TEXT NOT NULL,
    start_date TEXT,
    benefits TEXT,
    work_location TEXT,
    work_type TEXT DEFAULT 'Full-time',
    probation_period TEXT DEFAULT '3 months',
    joining_bonus TEXT,
    additional_notes TEXT,
    status TEXT DEFAULT 'pending',
    counter_offer JSONB DEFAULT '{}'::jsonb,
    sent_date TIMESTAMPTZ DEFAULT NOW(),
    response_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    application_id TEXT DEFAULT '',
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions TEXT DEFAULT '',
    duration_minutes INT DEFAULT 60,
    due_date TIMESTAMPTZ,
    questions JSONB DEFAULT '[]'::jsonb,
    coding_questions JSONB DEFAULT '[]'::jsonb,
    total_points INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Assessment Attempts Table
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '[]'::jsonb,
    coding_answers JSONB DEFAULT '[]'::jsonb,
    score NUMERIC DEFAULT 0,
    max_score NUMERIC DEFAULT 0,
    percentage NUMERIC DEFAULT 0,
    submitted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'in-progress',
    proctor_events JSONB DEFAULT '[]'::jsonb,
    tab_switch_count INT DEFAULT 0,
    code_snapshots JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (assessment_id, candidate_id)
);

-- 10. Resume Chunks Table
CREATE TABLE IF NOT EXISTS resume_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'experience',
    embedding FLOAT8[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiters_user_id ON recruiters(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_recruiter_id ON applications(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_offers_candidate_id ON offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_recruiter_id ON offers(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
