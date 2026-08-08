import { Suspense } from "react";
import { LandingPage } from "@/app/pages/LandingPage";
import { PageSkeleton } from "@/components/PageSkeleton";

export const revalidate = 3600; // Revalidate every hour

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LandingPage />
    </Suspense>
  );
}
