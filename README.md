# TalentBridge

TalentBridge is an AI-powered recruitment platform that connects
recruiters and candidates through intelligent resume analysis, semantic
search, and automated evaluation.

The platform simplifies the hiring process by enabling recruiters to
post jobs, analyze resumes using AI, and identify the best candidates
through semantic matching.

------------------------------------------------------------------------

# Key Features

## Candidate Features

-   Candidate registration and login
-   Profile creation
-   Resume upload
-   Apply for jobs
-   Track application status

## Recruiter Features

-   Post job openings
-   View candidate applications
-   Candidate filtering
-   AI-based resume insights

## AI Capabilities

-   Resume parsing from PDF
-   Semantic resume search using embeddings
-   AI-based resume evaluation
-   Candidate-job matching

------------------------------------------------------------------------

# Tech Stack

## Frontend

-   React
-   Vite
-   Material UI
-   Radix UI Components
-   Emotion Styling

## Backend

-   Node.js
-   Express.js
-   JWT Authentication
-   Multer (file uploads)

## Database

-   MongoDB
-   Mongoose ODM

## AI / Machine Learning

-   Transformers.js (@xenova/transformers)
-   Google Generative AI (@google/genai)
-   Resume parsing with pdf-parse

------------------------------------------------------------------------

# System Architecture

Frontend (React + Vite) │ │ REST API ▼ Backend (Node.js + Express) │ ├──
Authentication (JWT) ├── Resume Processing ├── Job Management ├──
Application System ├── Semantic Search │ ▼ MongoDB Database

AI Layer ├── Resume Parsing ├── Embedding Generation └── AI Resume
Evaluation

------------------------------------------------------------------------

# Project Structure

TalentBridge │ ├── backend │ ├── controllers │ ├── middleware │ ├──
models │ ├── routes │ ├── utils │ └── server.js │ ├── frontend │ ├──
components │ ├── pages │ ├── services │ ├── assets │ └── main.jsx │ └──
README.md

------------------------------------------------------------------------

# Installation Guide

## 1 Clone Repository

git clone https://github.com/YOUR_USERNAME/TalentBridge.git cd
TalentBridge

------------------------------------------------------------------------

## 2 Install Backend Dependencies

cd backend npm install

------------------------------------------------------------------------

## 3 Install Frontend Dependencies

cd ../frontend npm install

------------------------------------------------------------------------

# Environment Variables

Create a `.env` file inside the backend folder.

PORT=5000 MONGO_URI=your_mongodb_atlas_connection
JWT_SECRET=your_secret_key GOOGLE_API_KEY=your_google_genai_key

------------------------------------------------------------------------

# Running the Project

## Start Backend

cd backend npm start

Server runs on: http://localhost:5000

------------------------------------------------------------------------

## Start Frontend

cd frontend npm run dev

Frontend runs on: http://localhost:5173

------------------------------------------------------------------------

# API Modules

Auth --- User authentication and authorization\
Jobs --- Job posting and management\
Applications --- Candidate job applications\
Resume --- Resume upload and parsing\
AI Evaluation --- AI-based resume analysis\
Search --- Semantic candidate search

------------------------------------------------------------------------

# AI Workflow

Resume Upload │ ▼ PDF Parsing (pdf-parse) │ ▼ Text Extraction │ ▼
Embedding Generation (Transformers) │ ▼ Semantic Matching │ ▼ Candidate
Ranking

------------------------------------------------------------------------

# Future Improvements

-   AI interview assistant
-   Interview scheduling
-   Video interview integration
-   Candidate skill graph
-   Recruiter analytics dashboard
-   Resume scoring system

------------------------------------------------------------------------

# Security Features

-   JWT Authentication
-   Password hashing using bcrypt
-   Secure file uploads
-   Environment variable protection

------------------------------------------------------------------------

# Contributing

1.  Fork the repository
2.  Create a feature branch
3.  Commit your changes
4.  Submit a pull request

------------------------------------------------------------------------

# License

MIT License

Copyright (c) 2026 Mukund Rakholiya
