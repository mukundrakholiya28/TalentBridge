"use client";

import { Suspense } from "react";
import { RecruiterOffers } from "@/app/pages/RecruiterOffers";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <RecruiterOffers />
    </Suspense>
  );
}
