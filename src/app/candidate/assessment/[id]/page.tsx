"use client";

import { Suspense } from "react";
import { CandidateAssessment } from "@/app/pages/CandidateAssessment";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <CandidateAssessment />
    </Suspense>
  );
}
