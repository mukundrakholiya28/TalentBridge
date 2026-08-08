"use client";

import { Suspense } from "react";
import { RecruiterMessages } from "@/app/pages/RecruiterMessages";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <RecruiterMessages />
    </Suspense>
  );
}
