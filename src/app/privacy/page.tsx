import { Suspense } from "react";
import { PrivacyPolicy } from "@/app/pages/PrivacyPolicy";
import { PageSkeleton } from "@/components/PageSkeleton";

export const revalidate = 86400; // Revalidate daily – fully static content

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PrivacyPolicy />
    </Suspense>
  );
}
