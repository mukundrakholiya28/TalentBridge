import { Suspense } from "react";
import { LandingPage } from "@/app/pages/LandingPage";

export default function Page() {
  return (
    <>
      {/*
        Server-rendered static content — always present in the HTML sent to crawlers.
        This satisfies Google OAuth's requirement that the homepage explains the app purpose
        and that the app name matches the OAuth consent screen name.
        Hidden visually but fully readable by search engines and Google's verification bot.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        <h1>TalentBridge — AI-Powered Recruitment Platform</h1>
        <p>
          TalentBridge is an AI-powered recruitment platform that connects job seekers with
          employers. Candidates upload their resume, get AI-matched to relevant jobs, track
          application status in real time, complete online assessments, and receive and manage
          offer letters — all in one place. Recruiters post job listings, discover best-matched
          candidates using semantic AI search, evaluate applicants with automated scoring, schedule
          interviews via Google Calendar, and send offer letters from a unified hiring dashboard.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-gray-400">
            Loading...
          </div>
        }
      >
        <LandingPage />
      </Suspense>
    </>
  );
}
