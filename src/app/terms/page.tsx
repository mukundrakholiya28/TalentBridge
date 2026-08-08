import { Suspense } from "react";
import { TermsOfService } from "@/app/pages/TermsOfService";
import { PageSkeleton } from "@/components/PageSkeleton";

export const revalidate = 86400; // Revalidate daily

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TermsOfService />
    </Suspense>
  );
}
