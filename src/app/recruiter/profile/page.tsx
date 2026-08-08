"use client";

import { Suspense } from "react";
import { RecruiterProfile } from "@/app/pages/RecruiterProfile";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <RecruiterProfile />
    </Suspense>
  );
}
