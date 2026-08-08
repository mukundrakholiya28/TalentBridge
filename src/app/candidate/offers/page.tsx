"use client";

import { Suspense } from "react";
import { OfferLetters } from "@/app/pages/OfferLetters";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <OfferLetters />
    </Suspense>
  );
}
