"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon,  Card, Button } from "@/shared/components";
import Link from "next/link";
import { formatTokens } from "../../token-saver/simulation/SimulationData";

// Test payload for Headroom: long conversation with repeated content
const HEADROOM_TEST_PAYLOAD = {
  messages: [
    { role: "system", content: "You are a helpful coding assistant." },
    { role: "user", content: "Viết function tính Fibonacci" },
    { role: "assistant", content: "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}" },
    { role: "user", content: "Thêm cache vào function trên" },
    { role: "assistant", content: "const cache = new Map();\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache.has(n)) return cache.get(n);\n  const result = fibonacci(n - 1) + fibonacci(n - 2);\n  cache.set(n, result);\n  return result;\n}" },
    { role: "user", content: "Đổi từ Map sang object" },
    { role: "assistant", content: "const cache = {};\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache[n] !== undefined) return cache[n];\n  cache[n] = fibonacci(n - 1) + fibonacci(n - 2);\n  return cache[n];\n}" },
    { role: "user", content: "Viết test cho function này" },
    { role: "assistant", content: "console.assert(fibonacci(0) === 0);\nconsole.assert(fibonacci(1) === 1);\nconsole.assert(fibonacci(10) === 55);\nconsole.assert(fibonacci(20) === 6765);\nconsole.log('All tests passed');" },
    { role: "user", content: "Giải thích độ phức tạp" },
    { role: "assistant", content: "Độ phức tạp thời gian: O(n) với memoization (mỗi số tính 1 lần). Không gian: O(n) cho cache + O(n) cho call stack." },
    { role: "user", content: "Có cách nào tối ưu không gian hơn không?" },
    { role: "assistant", content: "Có thể dùng iterative bottom-up: chỉ cần 2 biến. Không gian O(1).\nfunction fib(n) {\n  if (n <= 1) return n;\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) {\n    [prev, curr] = [curr, prev + curr];\n  }\n  return curr;\n}" },
    { role: "user", content: "Viết lại toàn bộ code thành 1 file hoàn chỉnh" },
    { role: "assistant", content: "const cache = {};\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  if (cache[n] !== undefined) return cache[n];\n  cache[n] = fibonacci(n - 1) + fibonacci(n - 2);\n  return cache[n];\n}\nfunction fibonacciIterative(n) {\n  if (n <= 1) return n;\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) [prev, curr] = [curr, prev + curr];\n  return curr;\n}\nconsole.assert(fibonacci(0) === 0);\nconsole.assert(fibonacci(10) === 55);\nconsole.log('All tests passed');" },
    { role: "user", content: "Giờ hãy giúp tôi implement binary search" },
  ],
  model: "gpt-4o",
};

function HeadroomTestCard() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runTest = async () => {
    setTesting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("http://localhost:8787/v1/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(HEADROOM_TEST_PAYLOAD),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-text flex items-center gap-1.5">
          <Icon name="network_ping" size={18} className="text-purple-500 text-base" />
          Test Headroom Proxy
        </h4>
        <Button size="sm" onClick={runTest} disabled={testing}>
          {testing ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
              Testing...
            </span>
          ) : (
            "Test Now"
          )}
        </Button>
      </div>

      {error && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 text-xs text-red-600">
          ❌ Proxy unreachable: {error}
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className={`text-xs font-medium ${result.tokens_saved > 0 ? "text-success" : "text-warning"}`}>
            {result.tokens_saved > 0
              ? `✅ Headroom is working! Saved ${result.tokens_saved} tokens`
              : "⚠️ Headroom is running but couldn't compress anything for this test payload"}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-surface-2">
              <div className="text-sm font-bold font-mono text-text">{result.tokens_before}</div>
              <div className="text-[9px] text-text-muted">Tokens before</div>
            </div>
            <div className="p-2 rounded bg-surface-2">
              <div className="text-sm font-bold font-mono text-text">{result.tokens_after}</div>
              <div className="text-[9px] text-text-muted">Tokens after</div>
            </div>
            <div className={`p-2 rounded ${result.tokens_saved > 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-surface-2"}`}>
              <div className={`text-sm font-bold font-mono ${result.tokens_saved > 0 ? "text-success" : "text-text"}`}>
                {result.tokens_saved}
              </div>
              <div className="text-[9px] text-text-muted">Saved</div>
            </div>
          </div>
          {result.tokens_saved === 0 && (
            <div className="text-[9px] text-text-muted leading-relaxed">
              💡 Headroom needs <strong>very long conversations (20+ messages)</strong> or <strong>highly repetitive content</strong> to compress.
              With short/single-turn requests, Headroom has nothing to compress — this is normal behavior.
              To see Headroom in action: create a conversation with 20+ turns and repetitive content.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function StatusDot({ enabled, color }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{
        backgroundColor: enabled ? color : "#64748b",
        boxShadow: enabled ? `0 0 6px ${color}66` : "none",
      }}
    />
  );
}

export default function TokenSaverTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/token-saver/stats", {
        headers: { "Cache-Control": "no-store" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      // silently fail — will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
        <span className="text-sm text-text-muted">Loading Token Saver data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10">
        <Icon name="error" size={18} className="text-3xl text-text-muted mb-2 block" />
        <p className="text-sm text-text-muted">Unable to load data. Check database.</p>
      </div>
    );
  }

  const { featureStatus, usage, savings } = data;
  const features = Object.entries(featureStatus);
  const activeCount = features.filter(([, f]) => f.enabled).length;

  return (
    <div className="space-y-5">
      {/* Feature status row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {features.map(([key, feature]) => (
          <Link
            key={key}
            href="/dashboard/token-saver/simulation"
            className="rounded-lg border p-3 transition-all hover:shadow-sm group"
            style={{
              borderColor: feature.enabled ? feature.color + "66" : "#e5e7eb",
              backgroundColor: feature.enabled ? feature.color + "08" : "transparent",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Icon name={feature.icon} size={14} />
                <span className="text-[11px] font-semibold text-text group-hover:text-primary transition-colors">
                  {key === "rtk" ? "RTK" : key === "headroom" ? "Headroom" : key === "caveman" ? "Caveman" : "Ponytail"}
                </span>
              </div>
              <StatusDot enabled={feature.enabled} color={feature.color} />
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                  feature.enabled
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {feature.enabled ? "ON" : "OFF"}
              </span>
              {(key === "caveman" || key === "ponytail") && feature.enabled && (
                <span className="text-[9px] text-text-muted">{feature.level}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Headroom test card */}
      {featureStatus.headroom.enabled && (
        <HeadroomTestCard />
      )}

      {/* Usage overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-base font-bold font-mono text-text">
            {formatTokens(usage.total.totalTokens)}
          </div>
          <div className="text-[10px] text-text-muted">Total tokens</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-base font-bold font-mono text-text">
            {formatTokens(usage.total.inputTokens)}
          </div>
          <div className="text-[10px] text-text-muted">Input</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-base font-bold font-mono text-text">
            {formatTokens(usage.total.outputTokens)}
          </div>
          <div className="text-[10px] text-text-muted">Output</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-base font-bold font-mono text-text">
            {usage.total.requests.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted">Requests</div>
        </div>
      </div>

      {/* Savings: RTK (real) + Headroom (est) + Output (est) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* RTK — measured from tool messages */}
        <Card>
          <h4 className="text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
            <Icon name="bolt" size={18} className="text-primary text-base" />
            RTK — Input Savings
            {savings.rtk.isReal && (
              <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 py-0.5 rounded font-mono">
                {savings.rtk.sampleCount} reqs
              </span>
            )}
            {!featureStatus.rtk.enabled && (
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.5 rounded">OFF</span>
            )}
          </h4>

          {!savings.rtk.isReal ? (
            <div className="text-center py-4">
              <p className="text-xs text-text-muted">{savings.rtk.method}</p>
              {featureStatus.rtk.enabled && savings.rtk.toolCallCount === 0 && (
                <p className="text-[10px] text-text-muted mt-1">
                  No requests found with tool call output &gt;500 bytes.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Tokens saved</span>
                <span className="font-mono text-primary font-semibold">
                  -{formatTokens(savings.rtk.tokensSaved)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Tool calls compressed</span>
                <span className="font-mono text-text">{savings.rtk.toolCallCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Bytes trimmed</span>
                <span className="font-mono text-text-muted">
                  {(savings.rtk.bytesSaved / 1024).toFixed(1)} KB
                </span>
              </div>
              {Object.keys(savings.rtk.filterHits).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(savings.rtk.filterHits).map(([f, n]) => (
                    <span key={f} className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded font-mono">
                      {f}: {n}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-[9px] text-text-muted leading-relaxed mt-1 italic flex items-start gap-1">
                <Icon name="check_circle" size={12} className="shrink-0 text-primary" />
                Measured from tool message content inside request body
              </div>
            </div>
          )}
        </Card>

        {/* Headroom — not estimated, use Test button */}
        <Card>
          <h4 className="text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
            <Icon name="compress" size={18} className="text-purple-500 text-base" />
            Headroom — Input Savings
            {!featureStatus.headroom.enabled && (
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.5 rounded">OFF</span>
            )}
          </h4>

          {!featureStatus.headroom.enabled ? (
            <div className="text-center py-4">
              <p className="text-xs text-text-muted">Headroom is OFF.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Status</span>
                <span className="font-mono text-success text-[11px]">✅ Proxy running</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Measurement method</span>
                <span className="font-mono text-text-muted text-[9px] text-right max-w-[200px]">
                  No auto-estimation — use Test button
                </span>
              </div>
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-[9px] text-amber-700 dark:text-amber-300 leading-relaxed">
                ⚠️ <strong>Cannot auto-estimate.</strong> Headroom only compresses long conversations (20+ msg) with repetitive content. Single-turn requests → always = 0. Use the <strong>"Test Now"</strong> button below to check.
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Output: Caveman + Ponytail estimates */}
      {(featureStatus.caveman.enabled || featureStatus.ponytail.enabled) && (
        <Card>
          <h4 className="text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
            <Icon name="auto_awesome" size={18} className="text-amber-500 text-base" />
            Caveman + Ponytail — Output Savings
            <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded">
              ⚠️ ESTIMATE
            </span>
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Estimated output tokens saved</span>
              <span className="font-mono text-amber-500 font-semibold">
                -{formatTokens(savings.output.tokensSaved)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Based on</span>
              <span className="font-mono text-text-muted text-[9px] text-right">
                {savings.output.parts.join(" + ") || "N/A"}
              </span>
            </div>
            <div className="text-[9px] text-amber-600 dark:text-amber-400 leading-relaxed flex items-start gap-1">
              <Icon name="warning" size={12} className="shrink-0" />
              Cannot measure output savings precisely — requires parallel A/B testing (feature on vs off) to know how many tokens the LLM would have output.
            </div>
          </div>
        </Card>
      )}

      {/* Total summary */}
      {activeCount > 0 && (
        <Card>
          <h4 className="text-xs font-semibold text-text mb-3 flex items-center gap-1.5">
            <Icon name="summarize" size={18} className="text-success text-base" />
            Total Savings ({activeCount}/4 features)
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Used (actual from usageHistory)</span>
              <span className="font-mono text-text font-semibold">{formatTokens(usage.total.totalTokens)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <Icon name="check_circle" size={14} className="text-primary" />
                RTK input saved
              </span>
              <span className="font-mono text-primary font-semibold">
                -{formatTokens(savings.rtk.tokensSaved)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <Icon name="warning" size={14} className="text-amber-500" />
                Caveman + Ponytail output estimated
              </span>
              <span className="font-mono text-amber-500 font-semibold">
                -{formatTokens(savings.output.tokensSaved)}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-text">Without Token Saver</span>
              <span className="font-mono text-warning font-semibold">
                ~{formatTokens(savings.originalEst)}
              </span>
            </div>
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-text-muted">Savings</span>
                <span className="font-mono text-success font-semibold">~{savings.savingsPct}%</span>
              </div>
              <div className="h-3 bg-surface-2 rounded-full overflow-hidden flex">
                {savings.rtk.tokensSaved > 0 && (
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.max((savings.rtk.tokensSaved / savings.originalEst) * 100, 1)}%` }} />
                )}
                {savings.headroom.tokensSaved > 0 && (
                  <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.max((savings.headroom.tokensSaved / savings.originalEst) * 100, 1)}%` }} />
                )}
                {savings.output.tokensSaved > 0 && (
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.max((savings.output.tokensSaved / savings.originalEst) * 100, 1)}%` }} />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[9px] text-text-muted flex-wrap">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> RTK</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Headroom</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Caveman+Ponytail ⚠️</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Potential */}
      <Card>
        <h4 className="text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
          <Icon name="rocket_launch" size={18} className="text-warning text-base" />
          Potential (enable all Ultra)
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Input savings possible</span>
            <span className="font-mono text-primary font-semibold">-{formatTokens(savings.potentialMax.inputSaved)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Output savings possible</span>
            <span className="font-mono text-amber-500 font-semibold">-{formatTokens(savings.potentialMax.outputSaved)}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted font-medium">Projected remaining</span>
            <span className="font-mono text-success font-semibold">
              ~{formatTokens(Math.max(0, usage.total.totalTokens - savings.potentialMax.totalSaved))}
            </span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-warning rounded-full flex items-center justify-end pr-1"
              style={{ width: `${Math.max(savings.potentialMax.savingsPct, 2)}%` }}>
              {savings.potentialMax.savingsPct > 10 && (
                <span className="text-[8px] text-white font-mono font-bold">-{savings.potentialMax.savingsPct}%</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Link to full simulation */}
      <Link
        href="/dashboard/token-saver/simulation"
        className="block rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors p-4 group"
      >
        <div className="flex items-center gap-3">
          <Icon name="science" size={18} className="text-primary text-2xl" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
              🧪 View Detailed Simulation
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Full simulation of input/output data, token counts, quality impact analysis, and guardrails for each feature.
            </p>
          </div>
          <Icon name="arrow_forward" size={18} className="text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Empty state */}
      {usage.total.requests === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <Icon name="database" size={18} className="text-3xl text-text-muted mb-2 block" />
          <p className="text-sm text-text-muted font-medium">No usage data yet</p>
          <p className="text-xs text-text-muted mt-1">
            Send requests through the ITXBridge endpoint to see real data.
          </p>
        </div>
      )}
    </div>
  );
}
