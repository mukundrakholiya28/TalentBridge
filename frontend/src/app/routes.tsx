import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { CandidateSignIn } from "./pages/CandidateSignIn";
import { CandidateSignUp } from "./pages/CandidateSignUp";
import { RecruiterSignIn } from "./pages/RecruiterSignIn";
import { RecruiterSignUp } from "./pages/RecruiterSignUp";
import { CandidateDashboard } from "./pages/CandidateDashboard";
import { RecruiterDashboard } from "./pages/RecruiterDashboard";
import { RecruiterProfile } from "./pages/RecruiterProfile";
import { CandidateProfile } from "./pages/CandidateProfile";
import { CandidateCompleteProfile } from "./pages/CandidateCompleteProfile";
import { RecruiterCompleteCompany } from "./pages/RecruiterCompleteCompany";
import { MyApplications } from "./pages/MyApplications";
import { InProcess } from "./pages/InProcess";
import { OfferLetters } from "./pages/OfferLetters";
import { Settings } from "./pages/Settings";
import { CandidateMessages } from "./pages/CandidateMessages";
import { JobDetails } from "./pages/JobDetails";
import { JobApplication } from "./pages/JobApplication";
import { PostJob } from "./pages/PostJob";
import { RecruiterJobs } from "./pages/RecruiterJobs";
import { JobApplications } from "./pages/JobApplications";
import { RecruiterInProcess } from "./pages/RecruiterInProcess";
import { SendOfferLetter } from "./pages/SendOfferLetter";
import { RecruiterOffers } from "./pages/RecruiterOffers";
import { RecruiterMessages } from "./pages/RecruiterMessages";
import { OAuthCallback } from "./pages/OAuthCallback";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/candidate/signin",
    Component: CandidateSignIn,
  },
  {
    path: "/candidate/signup",
    Component: CandidateSignUp,
  },
  {
    path: "/recruiter/signin",
    Component: RecruiterSignIn,
  },
  {
    path: "/recruiter/signup",
    Component: RecruiterSignUp,
  },
  {
    path: "/candidate/dashboard",
    Component: CandidateDashboard,
  },
  {
    path: "/candidate/profile",
    Component: CandidateProfile,
  },
  {
    path: "/candidate/applications",
    Component: MyApplications,
  },
  {
    path: "/candidate/in-process",
    Component: InProcess,
  },
  {
    path: "/candidate/offers",
    Component: OfferLetters,
  },
  {
    path: "/candidate/messages",
    Component: CandidateMessages,
  },
  {
    path: "/candidate/settings",
    Component: Settings,
  },
  {
    path: "/candidate/complete-profile",
    Component: CandidateCompleteProfile,
  },
  {
    path: "/job/:id",
    Component: JobDetails,
  },
  {
    path: "/job/:id/apply",
    Component: JobApplication,
  },
  {
    path: "/recruiter/dashboard",
    Component: RecruiterDashboard,
  },
  {
    path: "/recruiter/post-job",
    Component: PostJob,
  },
  {
    path: "/recruiter/jobs",
    Component: RecruiterJobs,
  },
  {
    path: "/recruiter/jobs/:jobId/applications",
    Component: JobApplications,
  },
  {
    path: "/recruiter/applications",
    Component: JobApplications,
  },
  {
    path: "/recruiter/in-process",
    Component: RecruiterInProcess,
  },
  {
    path: "/recruiter/send-offer/:applicationId",
    Component: SendOfferLetter,
  },
  {
    path: "/recruiter/offers",
    Component: RecruiterOffers,
  },
  {
    path: "/recruiter/messages",
    Component: RecruiterMessages,
  },
  {
    path: "/recruiter/settings",
    Component: Settings,
  },
  {
    path: "/recruiter/profile",
    Component: RecruiterProfile,
  },
  {
    path: "/recruiter/complete-company",
    Component: RecruiterCompleteCompany,
  },
  {
    path: "/auth/oauth-callback",
    Component: OAuthCallback,
  },
]);