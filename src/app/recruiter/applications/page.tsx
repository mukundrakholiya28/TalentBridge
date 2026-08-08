"use client";

import { Suspense } from "react";
import { JobApplications } from "@/app/pages/JobApplications";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <JobApplications />
    </Suspense>
  );
}
