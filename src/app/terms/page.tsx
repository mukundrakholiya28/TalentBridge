"use client";

import { Suspense } from "react";
import { TermsOfService } from "@/app/pages/TermsOfService";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <TermsOfService />
    </Suspense>
  );
}
