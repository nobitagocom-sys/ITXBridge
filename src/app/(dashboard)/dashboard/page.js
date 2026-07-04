import { Suspense } from "react";
import { UsageStats, CardSkeleton } from "@/shared/components";

export default function DashboardPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <UsageStats />
    </Suspense>
  );
}
