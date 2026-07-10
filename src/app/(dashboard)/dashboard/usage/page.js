"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UsageStats, RequestLogger, CardSkeleton, SegmentedControl, Icon } from "@/shared/components";
import RequestDetailsTab from "./components/RequestDetailsTab";
import TokenSaverTab from "./components/TokenSaverTab";
import SessionsView from "./components/SessionsView";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
];

export default function UsagePage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <UsageContent />
    </Suspense>
  );
}

function UsageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [period, setPeriod] = useState("today");

  const tabFromUrl = searchParams.get("tab");
  const activeTab = tabFromUrl && ["overview", "logs", "details", "tokensaver", "sessions"].includes(tabFromUrl)
    ? tabFromUrl
    : "overview";

  const handleTabChange = (value) => {
    if (value === activeTab) return;
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.push(`/dashboard/usage?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Tabs + period selector on same row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          options={[
            { value: "overview", label: "Overview" },
            { value: "sessions", label: "Sessions" },
            { value: "details", label: "Details" },
            { value: "tokensaver", label: "Token Saver" },
          ]}
          value={activeTab}
          onChange={handleTabChange}
          className="w-full sm:w-auto"
        />
        {(activeTab === "overview" || activeTab === "sessions") && (
          <SegmentedControl
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            size="sm"
            className="w-full sm:w-auto"
          />
        )}
        {activeTab === "tokensaver" && (
          <span className="text-[10px] text-text-muted bg-surface-1 px-2 py-1 rounded font-mono">
            auto-refresh 15s
          </span>
        )}
      </div>

      {activeTab === "overview" && (
        <Suspense fallback={<CardSkeleton />}>
          <UsageStats period={period} setPeriod={setPeriod} hidePeriodSelector />
        </Suspense>
      )}
      {activeTab === "sessions" && (
        <SessionsTabContent period={period} />
      )}
      {activeTab === "logs" && <RequestLogger />}
      {activeTab === "details" && <RequestDetailsTab />}
      {activeTab === "tokensaver" && <TokenSaverTab />}
    </div>
  );
}

const SSE_FLUSH_MS = 2000;

function SessionsTabContent({ period }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch sessions via REST on mount and period change
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show spinner on period change
    setLoading(true);
    fetch(`/api/usage/sessions?period=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.sessions) setSessions(data.sessions);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  // SSE connection — throttled to avoid render storms
  const sseBuffer = useRef(null);
  const sseTimer = useRef(null);
  useEffect(() => {
    const es = new EventSource("/api/usage/stream");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.activeSessions || !Array.isArray(data.activeSessions)) return;
        sseBuffer.current = data.activeSessions;
        if (!sseTimer.current) {
          sseTimer.current = setTimeout(() => {
            sseTimer.current = null;
            const buffered = sseBuffer.current;
            sseBuffer.current = null;
            if (!buffered) return;
            setSessions((prev) => {
              const sseMap = new Map();
              for (const s of buffered) sseMap.set(s.sessionId, s);

              const merged = prev.map((s) => {
                const updated = sseMap.get(s.sessionId);
                if (updated) {
                  sseMap.delete(s.sessionId);
                  return { ...s, ...updated };
                }
                return s;
              });

              for (const s of sseMap.values()) merged.push(s);

              merged.sort((a, b) => {
                if (a.status === "active" && b.status !== "active") return -1;
                if (a.status !== "active" && b.status === "active") return 1;
                return (b.lastActivity || 0) - (a.lastActivity || 0);
              });

              return merged;
            });
          }, SSE_FLUSH_MS);
        }
      } catch {}
    };

    return () => {
      es.close();
      if (sseTimer.current) {
        clearTimeout(sseTimer.current);
        sseTimer.current = null;
      }
    };
  }, []);

  return <SessionsView sessions={sessions} loading={loading} />;
}
