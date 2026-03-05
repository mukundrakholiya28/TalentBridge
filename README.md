# TalentBridge

TalentBridge is an AI-powered recruitment platform that connects
recruiters and candidates using intelligent resume analysis, semantic
search, and automated evaluation.

The platform streamlines the hiring process by allowing recruiters to
post jobs, search resumes using semantic similarity, and evaluate
candidates efficiently.

------------------------------------------------------------------------

## Features

### Candidate Features

-   Create candidate profile
-   Upload resume
-   Apply to jobs
-   Track application status

### Recruiter Features

-   Post job openings
-   View candidate applications
-   Semantic resume search
-   ATS-based resume evaluation

### AI Features

-   Resume parsing
-   Semantic search using embeddings
-   AI-based resume evaluation
-   Candidate ranking

------------------------------------------------------------------------

## Tech Stack

### Frontend

-   React
-   React Router
-   JavaScript
-   Tailwind CSS

### Backend

-   Node.js
-   Express.js

### Database

-   MongoDB Atlas
-   Mongoose

### AI / Search

-   HuggingFace embeddings
-   Vector based semantic search

------------------------------------------------------------------------

## Project Architecture

    TalentBridge
    │
    ├── backend
    │   ├── controllers
    │   ├── middleware
    │   ├── models
    │   ├── routes
    │   ├── utils
    │   └── server.js
    │
    ├── frontend
    │   ├── components
    │   ├── pages
    │   ├── services
    │   └── App.js
    │
    └── README.md

------------------------------------------------------------------------

## Installation

### 1 Clone the repository

    git clone https://github.com/YOUR_USERNAME/TalentBridge.git
    cd TalentBridge

### 2 Install Backend Dependencies

    cd backend
    npm install

### 3 Install Frontend Dependencies

    cd ../frontend
    npm install

### 4 Setup Environment Variables

Create a `.env` file inside the backend folder:

    PORT=5000
    MONGO_URI=your_mongodb_connection
    JWT_SECRET=your_secret

### 5 Run Backend

    cd backend
    npm start

### 6 Run Frontend

    cd frontend
    npm run dev

------------------------------------------------------------------------

## API Modules

  Module         Description
  -------------- -----------------------------------
  Auth           User authentication
  Jobs           Job creation and management
  Applications   Candidate applications
  ATS            Resume evaluation
  Search         Semantic resume search
  Messaging      Recruiter-candidate communication

------------------------------------------------------------------------

## Folder Structure

### Backend

    backend/
    controllers/
    models/
    middleware/
    routes/
    utils/

### Frontend

    frontend/
    components/
    pages/
    services/

------------------------------------------------------------------------

## Future Improvements

-   Interview scheduling
-   Video interview integration
-   AI interview assistant
-   Candidate skill graph
-   Recruiter analytics dashboard

------------------------------------------------------------------------

## Contributing

Contributions are welcome.

Steps:

1.  Fork the repository
2.  Create feature branch
3.  Commit changes
4.  Create pull request

------------------------------------------------------------------------

## License

MIT License

Copyright (c) 2026 Mukund Rakholiya

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files to deal in the
Software without restriction.
