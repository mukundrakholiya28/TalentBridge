"use client";

import { Suspense } from "react";
import { Settings } from "@/app/pages/Settings";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <Settings />
    </Suspense>
  );
}
