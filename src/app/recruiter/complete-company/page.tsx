"use client";

import { Suspense } from "react";
import { RecruiterCompleteCompany } from "@/app/pages/RecruiterCompleteCompany";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <RecruiterCompleteCompany />
    </Suspense>
  );
}
