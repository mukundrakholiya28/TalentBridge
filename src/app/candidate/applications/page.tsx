"use client";

import { Suspense } from "react";
import { MyApplications } from "@/app/pages/MyApplications";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <MyApplications />
    </Suspense>
  );
}
