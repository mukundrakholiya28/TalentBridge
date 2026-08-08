"use client";

import { Suspense } from "react";
import { JobApplication } from "@/app/pages/JobApplication";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <JobApplication />
    </Suspense>
  );
}
