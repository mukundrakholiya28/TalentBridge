"use client";

import { Suspense } from "react";
import { PrivacyPolicy } from "@/app/pages/PrivacyPolicy";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <PrivacyPolicy />
    </Suspense>
  );
}
