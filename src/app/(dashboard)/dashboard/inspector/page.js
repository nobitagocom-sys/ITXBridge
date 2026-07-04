"use client";

import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components";
import RequestInspector from "./components/RequestInspector";

export default function InspectorPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <RequestInspector />
    </Suspense>
  );
}
