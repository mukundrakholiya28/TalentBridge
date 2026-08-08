"use client";

import { Suspense } from "react";
import { RecruiterSignIn } from "@/app/pages/RecruiterSignIn";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <RecruiterSignIn />
    </Suspense>
  );
}
