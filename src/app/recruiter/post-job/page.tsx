"use client";

import { Suspense } from "react";
import { PostJob } from "@/app/pages/PostJob";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <PostJob />
    </Suspense>
  );
}
