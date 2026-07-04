"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon,  Card } from "@/shared/components";
import { formatTokens } from "./SimulationData";

function StatusDot({ enabled, color }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{
        backgroundColor: enabled ? color : "#64748b",
        boxShadow: enabled ? `0 0 8px ${color}66` : "none",
      }}
    />
  );
}

function PulseIndicator() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
    </span>
  );
}

export default function RealtimeStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/token-saver/stats", {
        headers: { "Cache-Control": "no-store" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 p-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          <span className="text-sm text-text-muted">Loading real data from ITXBridge...</span>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <div className="flex items-center gap-3 p-4 text-warning">
          <Icon name="error" />
          <span className="text-sm">
            Unable to load real data: {error || "Unknown error"}. Check database and observability settings.
          </span>
        </div>
      </Card>
    );
  }

  const { featureStatus, usage, savings } = data;
  const features = Object.entries(featureStatus);
  const activeCount = features.filter(([, f]) => f.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <PulseIndicator />
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            📡 Realtime Token Saver Status
          </h3>
          <span className="text-[10px] text-text-muted bg-surface-1 px-1.5 py-0.5 rounded font-mono">
            refresh 15s
          </span>
        </div>
        {lastRefresh && (
          <span className="text-[10px] text-text-muted font-mono">
            Updated: {lastRefresh.toLocaleTimeString("en-US")}
          </span>
        )}
      </div>

      {/* Feature Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {features.map(([key, feature]) => {
          const savingsRate = key === "rtk"
            ? "~35% input"
            : key === "headroom"
              ? "~55% input"
              : key === "caveman"
                ? `~${feature.level === "lite" ? "30" : feature.level === "full" ? "60" : "80"}% output`
                : `~${feature.level === "lite" ? "25" : feature.level === "full" ? "55" : "82"}% output`;

          return (
            <div
              key={key}
              className="rounded-lg border p-3 transition-all"
              style={{
                borderColor: feature.enabled ? feature.color + "66" : "#e5e7eb",
                backgroundColor: feature.enabled ? feature.color + "08" : "transparent",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon name={feature.icon} size={14} />
                  <span className="text-[11px] font-semibold text-text">
                    {key === "rtk" ? "RTK" : key === "headroom" ? "Headroom" : key === "caveman" ? "Caveman" : "Ponytail"}
                  </span>
                </div>
                <StatusDot enabled={feature.enabled} color={feature.color} />
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                    feature.enabled
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {feature.enabled ? "ACTIVE" : "OFF"}
                </span>
                <span className="text-[10px] text-text-muted">
                  {savingsRate}
                  {key === "caveman" || key === "ponytail" ? ` · ${feature.level}` : ""}
                </span>
              </div>
              {key === "headroom" && feature.enabled && (
                <div className="mt-1.5 text-[9px] text-text-muted font-mono truncate" title={feature.url}>
                  {feature.url}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Usage Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold font-mono text-text">
            {formatTokens(usage.total.totalTokens)}
          </div>
          <div className="text-[10px] text-text-muted">Total tokens used</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold font-mono text-text">
            {formatTokens(usage.total.inputTokens)}
          </div>
          <div className="text-[10px] text-text-muted">Input tokens</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold font-mono text-text">
            {formatTokens(usage.total.outputTokens)}
          </div>
          <div className="text-[10px] text-text-muted">Output tokens</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold font-mono text-text">
            {usage.total.requests.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted">Total requests</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold font-mono text-success">
            {formatTokens(usage.last24h.totalTokens)}
          </div>
          <div className="text-[10px] text-text-muted">Last 24h</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold font-mono text-text">
            {usage.last24h.requests.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted">Requests 24h</div>
        </div>
      </div>

      {/* Savings Estimation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Savings */}
        <Card>
          <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="savings" size={18} className="text-success text-lg" />
            Estimated savings ({activeCount}/4 features active)
          </h4>

          {activeCount === 0 ? (
            <div className="text-center py-6">
              <Icon name="info" size={18} className="text-4xl text-text-muted mb-2 block" />
              <p className="text-sm text-text-muted">
                No token saver features are enabled yet.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Enable features in{" "}
                <a href="/dashboard/token-saver" className="text-primary hover:underline">
                  Token Saver settings
                </a>{" "}
                to start saving tokens.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Total tokens used (actual)</span>
                <span className="text-sm font-mono font-semibold text-text">
                  {formatTokens(usage.total.totalTokens)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Estimated tokens saved</span>
                <span className="text-sm font-mono font-semibold text-success">
                  -{formatTokens(savings.estimatedTotalSaved)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Total without Token Saver</span>
                <span className="text-sm font-mono font-semibold text-warning">
                  ~{formatTokens(usage.total.totalTokens + savings.estimatedTotalSaved)}
                </span>
              </div>

              {/* Savings bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-text-muted">Estimated savings rate</span>
                  <span className="font-mono text-success font-semibold">
                    ~{savings.overallSavingsPct}%
                  </span>
                </div>
                <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all duration-700 flex items-center justify-end pr-1.5"
                    style={{ width: `${Math.max(savings.overallSavingsPct, 2)}%` }}
                  >
                    {savings.overallSavingsPct > 8 && (
                      <span className="text-[9px] text-white font-mono font-bold">
                        {savings.overallSavingsPct}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="p-2 rounded bg-surface-2 text-center">
                  <div className="text-[10px] text-text-muted">Input saved</div>
                  <div className="text-xs font-mono font-semibold text-primary">
                    {formatTokens(savings.estimatedInputSaved)}
                  </div>
                </div>
                <div className="p-2 rounded bg-surface-2 text-center">
                  <div className="text-[10px] text-text-muted">Output saved</div>
                  <div className="text-xs font-mono font-semibold text-amber-500">
                    {formatTokens(savings.estimatedOutputSaved)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Potential Max Savings */}
        <Card>
          <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="rocket_launch" size={18} className="text-warning text-lg" />
            Maximum savings potential
          </h4>

          {activeCount === 4 && (
            <div className="text-center py-4">
              <Icon name="check_circle" size={18} className="text-4xl text-success mb-2 block" />
              <p className="text-sm text-success font-medium">All 4 features are already enabled!</p>
              <p className="text-xs text-text-muted mt-1">
                You are at the optimal savings configuration. You can increase to Ultra for even more savings.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Current total tokens</span>
              <span className="text-sm font-mono font-semibold text-text">
                {formatTokens(usage.total.totalTokens)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                Additional savings possible (enable all Ultra)
              </span>
              <span className="text-sm font-mono font-semibold text-warning">
                -{formatTokens(savings.potentialMax.totalSaved)}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text">
                Projected after max enable
              </span>
              <span className="text-sm font-mono font-semibold text-success">
                ~{formatTokens(Math.max(0, usage.total.totalTokens - savings.potentialMax.totalSaved))}
              </span>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-text-muted">Potential savings</span>
                <span className="font-mono text-warning font-semibold">
                  ~{savings.potentialMax.savingsPct}%
                </span>
              </div>
              <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning rounded-full transition-all duration-700 flex items-center justify-end pr-1.5"
                  style={{ width: `${Math.max(savings.potentialMax.savingsPct, 2)}%` }}
                >
                  {savings.potentialMax.savingsPct > 8 && (
                    <span className="text-[9px] text-white font-mono font-bold">
                      {savings.potentialMax.savingsPct}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-text-muted leading-relaxed mt-2">
              {savings.potentialMax.description}
            </p>
          </div>
        </Card>
      </div>

      {/* Recent Models */}
      {usage.recentModels && usage.recentModels.length > 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="model_training" size={18} className="text-text-muted text-lg" />
            Recently used models (24h)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="text-left py-1.5 pr-4 font-medium">Model</th>
                  <th className="text-right py-1.5 px-2 font-medium">Requests</th>
                  <th className="text-right py-1.5 px-2 font-medium">Input Tokens</th>
                  <th className="text-right py-1.5 px-2 font-medium">Output Tokens</th>
                  <th className="text-right py-1.5 pl-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {usage.recentModels.map((m, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-surface-1 transition-colors">
                    <td className="py-1.5 pr-4 font-mono text-[11px]">{m.model || "unknown"}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{m.cnt}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatTokens(m.promptTok)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatTokens(m.completionTok)}</td>
                    <td className="py-1.5 pl-2 text-right font-mono font-semibold">
                      {formatTokens((m.promptTok || 0) + (m.completionTok || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty state for no data */}
      {usage.total.requests === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <Icon name="database" size={18} className="text-4xl text-text-muted mb-2 block" />
          <p className="text-sm text-text-muted font-medium">No real usage data yet</p>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            Send some requests through the ITXBridge endpoint to see real data here.
            Make sure <code className="text-primary">enableObservability</code> is on in settings.
          </p>
          <a
            href="/dashboard/endpoint"
            className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
          >
            <Icon name="api" size={18} className="text-sm" />
            View endpoint URL
          </a>
        </div>
      )}
    </div>
  );
}
