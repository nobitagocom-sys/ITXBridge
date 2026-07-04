"use client";
import { Icon } from "@/shared/components";

import { useState, useEffect, useCallback, useRef } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Badge from "@/shared/components/Badge";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/shared/utils/cn";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function fmtMs(ms) {
  if (!ms && ms !== 0) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function statusVariant(status) {
  if (!status) return "default";
  if (status === "success") return "success";
  if (status === "error") return "error";
  return "warning";
}

// Normalize tokens — DB stores either input_tokens/output_tokens or prompt_tokens/completion_tokens
function getTokens(tokens) {
  if (!tokens) return { in: 0, out: 0 };
  return {
    in: tokens.prompt_tokens || tokens.input_tokens || 0,
    out: tokens.completion_tokens || tokens.output_tokens || 0,
  };
}

/** Normalize message text — handles OpenAI { content: string|array } and Gemini { parts: [{ text }] } */
function messageText(m) {
  if (!m) return "";
  // Gemini format: m.parts[{ text, ... }]
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p) => p.text !== undefined || p.functionCall || p.functionResponse)
      .map((p) => p.text || JSON.stringify(p))
      .join("\n");
  }
  // OpenAI / standard format: m.content (string or array of content blocks)
  const c = m.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .filter((p) => p.type === "text" || p.type === "input_text")
      .map((p) => p.text || p.input_text || "")
      .join("\n");
  }
  return JSON.stringify(c);
}

/** Extract last user message preview */
function extractUserPreview(request) {
  if (!request || request._truncated) return request?._preview ? "[truncated] " + request._preview.slice(0, 100) : null;
  const msgs = request.messages || request.input || request.contents || [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role === "user") {
      const text = messageText(m);
      if (text) return text.slice(0, 150);
    }
  }
  return null;
}

// ─── JsonViewer ───────────────────────────────────────────────────────────────

function JsonViewer({ data, maxHeight = "400px", label }) {
  const [copied, setCopied] = useState(false);
  const isTruncated = data && typeof data === "object" && data._truncated;
  const text = isTruncated
    ? `// ⚠ Truncated — original size: ${(data._originalSize / 1024).toFixed(0)}KB\n// Preview:\n${data._preview || ""}`
    : (typeof data === "string" ? data : JSON.stringify(data, null, 2));

  const handleCopy = () => {
    navigator.clipboard.writeText(typeof data === "string" ? data : JSON.stringify(data, null, 2))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-3">
            {isTruncated && (
              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Icon name="warning" size={13} />
                Truncated ({(data._originalSize / 1024).toFixed(0)}KB)
              </span>
            )}
            <button type="button" onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-main transition-colors">
              <Icon name={copied ? "check" : "content_copy"} size={14} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
      <pre className="w-full overflow-auto rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-white/[0.03] p-3 font-mono text-xs text-text-main leading-relaxed"
        style={{ maxHeight }}>
        {text || "(empty)"}
      </pre>
    </div>
  );
}

// ─── MessageDiff ─────────────────────────────────────────────────────────────

function extractMessages(body) {
  if (!body || body._truncated) return [];
  return body.messages || body.input || body.contents || [];
}

function RolePill({ role }) {
  const colors = {
    user: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    assistant: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    system: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    tool: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  };
  return (
    <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide self-start shrink-0",
      colors[role] || "bg-surface-2 text-text-muted")}>
      {role || "?"}
    </span>
  );
}

function MessageCard({ m, modified }) {
  const text = messageText(m);
  const hasTools = m?.tool_calls?.length > 0 || m?.tool_use;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1 flex-wrap">
        <RolePill role={m?.role} />
        {modified && <Icon name="edit" size={12} className="text-amber-500" title="Modified" />}
        {hasTools && <span className="text-[10px] text-text-muted">{m.tool_calls?.length || 1} tool call(s)</span>}
      </div>
      {text ? (
        <pre className="w-full overflow-auto rounded bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 p-2 font-mono text-[11px] text-text-main leading-relaxed whitespace-pre-wrap break-words max-h-48">
          {text}
        </pre>
      ) : (
        <span className="text-xs text-text-muted italic">(no text content — may have images/audio/tool data)</span>
      )}
    </div>
  );
}

function TruncatedWarning({ data, side }) {
  if (!data?._truncated) return null;
  const sizeKb = data._originalSize ? (data._originalSize / 1024).toFixed(0) : "?";
  return (
    <div className="col-span-2 flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-900/15 dark:border-amber-600/30 p-3 text-sm text-amber-700 dark:text-amber-300">
      <Icon name="warning" size={16} className="shrink-0 mt-0.5" />
      <div>
        <strong>{side}</strong> was truncated ({sizeKb}KB &gt; old 5KB storage limit).
        {" "}New requests have been fixed (200KB limit). Send more requests to view full data.
      </div>
    </div>
  );
}

function MessageDiff({ clientBody, llmBody }) {
  const clientMsgs = extractMessages(clientBody);
  const llmMsgs = extractMessages(llmBody);
  const maxLen = Math.max(clientMsgs.length, llmMsgs.length);

  const clientTruncated = clientBody?._truncated;
  const llmTruncated = llmBody?._truncated;

  if (clientTruncated || llmTruncated) {
    // Try to extract partial messages from the _preview string (first 2000 chars of JSON)
    function parsePreviewMessages(body) {
      if (!body?._preview) return [];
      try {
        // Try to parse the full preview as JSON (might be complete if messages are short)
        const parsed = JSON.parse(body._preview);
        return parsed.messages || parsed.input || [];
      } catch {
        // Partial JSON — extract messages with regex
        const msgs = [];
        const rolePattern = /"role"\s*:\s*"(\w+)"/g;
        const textPattern = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        const contentStrPattern = /"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        const roles = [...body._preview.matchAll(rolePattern)].map(m => m[1]);
        const texts = [...body._preview.matchAll(textPattern)].map(m => m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
        const contentStrs = [...body._preview.matchAll(contentStrPattern)].map(m => m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
        const contents = texts.length > 0 ? texts : contentStrs;
        for (let i = 0; i < roles.length; i++) {
          msgs.push({ role: roles[i], content: (contents[i] || "(content not in preview)") + (i === roles.length - 1 ? " …[truncated]" : "") });
        }
        return msgs;
      }
    }

    const previewClientMsgs = parsePreviewMessages(clientBody);
    const previewLlmMsgs = parsePreviewMessages(llmBody);

    return (
      <div className="flex flex-col gap-4">
        <TruncatedWarning data={clientBody} side="User input" />
        <TruncatedWarning data={llmBody} side="LLM payload" />
        {(previewClientMsgs.length > 0 || previewLlmMsgs.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Badge variant="info" icon="arrow_downward">User Input (preview)</Badge>
              {previewClientMsgs.map((m, i) => (
                <div key={i} className="rounded-lg border border-black/5 dark:border-white/5 p-2">
                  <MessageCard m={m} modified={false} />
                </div>
              ))}
              {previewClientMsgs.length === 0 && <span className="text-xs text-text-muted italic">Unable to parse from preview</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant="warning" icon="arrow_upward">LLM Payload (preview)</Badge>
              {previewLlmMsgs.map((m, i) => (
                <div key={i} className="rounded-lg border border-black/5 dark:border-white/5 p-2">
                  <MessageCard m={m} modified={false} />
                </div>
              ))}
              {previewLlmMsgs.length === 0 && <span className="text-xs text-text-muted italic">Unable to parse from preview</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (maxLen === 0) {
    return <p className="text-sm text-text-muted italic">No messages found in this request.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Headers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="info" icon="arrow_downward">User Input</Badge>
          <span className="text-xs text-text-muted">{clientMsgs.length} msg(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" icon="arrow_upward">Sent to LLM</Badge>
          <span className="text-xs text-text-muted">{llmMsgs.length} msg(s)</span>
        </div>
      </div>

      {Array.from({ length: maxLen }).map((_, i) => {
        const cm = clientMsgs[i];
        const lm = llmMsgs[i];
        const changed = messageText(cm) !== messageText(lm) || cm?.role !== lm?.role;

        return (
          <div key={i} className={cn(
            "grid grid-cols-2 gap-3 rounded-lg p-2",
            changed
              ? "border border-amber-300/40 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-900/10"
              : "border border-black/5 dark:border-white/5"
          )}>
            <div>
              {cm
                ? <MessageCard m={cm} modified={false} />
                : <span className="text-xs text-text-muted italic px-1">— not present (injected by itxbridge)</span>
              }
            </div>
            <div>
              {lm
                ? <MessageCard m={lm} modified={changed} />
                : <span className="text-xs text-text-muted italic px-1">— removed by itxbridge</span>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SummaryChanges ──────────────────────────────────────────────────────────

function SummaryChanges({ clientBody, llmBody }) {
  if (!clientBody || !llmBody) return <p className="text-sm text-text-muted italic">No data available.</p>;
  if (clientBody._truncated || llmBody._truncated) {
    return (
      <div className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
        <Icon name="warning" size={16} />
        Old data was truncated — cannot compare. Send more new requests to view full diff.
      </div>
    );
  }

  const changes = [];

  if (clientBody.model !== llmBody.model) {
    changes.push({ label: "Model rewritten", from: clientBody.model, to: llmBody.model });
  }

  const cm = extractMessages(clientBody).length;
  const lm = extractMessages(llmBody).length;
  if (cm !== lm) {
    changes.push({ label: "Message count", from: `${cm}`, to: `${lm}` });
  }

  const clientHasSystem = extractMessages(clientBody).some((m) => m.role === "system");
  const llmHasSystem = extractMessages(llmBody).some((m) => m.role === "system");
  if (!clientHasSystem && llmHasSystem) {
    const sysMsg = extractMessages(llmBody).find((m) => m.role === "system");
    const sysText = messageText(sysMsg);
    changes.push({ label: "System prompt injected", note: sysText.slice(0, 120) + (sysText.length > 120 ? "…" : "") });
  }

  const ct = clientBody.tools?.length || 0;
  const lt = llmBody.tools?.length || 0;
  if (ct !== lt) {
    changes.push({ label: "Tools", from: `${ct} tools`, to: `${lt} tools` });
  }

  const cThink = JSON.stringify(clientBody.thinking || clientBody.reasoning_effort || null);
  const lThink = JSON.stringify(llmBody.thinking || llmBody.reasoning_effort || null);
  if (cThink !== lThink) {
    changes.push({ label: "Thinking config", from: cThink === "null" ? "(none)" : cThink, to: lThink === "null" ? "(none)" : lThink });
  }

  // Caveman/Ponytail detection (system prompt prefix hints)
  const llmSys = messageText(extractMessages(llmBody).find((m) => m.role === "system") || {});
  if (llmSys.includes("Respond like terse caveman")) changes.push({ label: "Caveman RTK injected" });
  if (llmSys.includes("lazy senior developer")) changes.push({ label: "Ponytail RTK injected" });

  if (changes.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <Icon name="check_circle" size={16} />
        No structural changes — request passed through unchanged
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {changes.map((c, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon name="swap_horiz" size={15} className="text-amber-500 shrink-0" />
            <span className="font-medium text-sm text-text-main">{c.label}</span>
            {c.from !== undefined && (
              <>
                <code className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs line-through">{c.from}</code>
                <span className="text-text-muted text-xs">→</span>
                <code className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">{c.to}</code>
              </>
            )}
          </div>
          {c.note && (
            <pre className="ml-6 text-xs text-text-muted rounded bg-black/[0.03] dark:bg-white/[0.03] p-2 whitespace-pre-wrap break-words max-h-24 overflow-auto border border-black/5 dark:border-white/5">
              {c.note}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "diff", label: "Message Diff", icon: "compare_arrows" },
  { id: "summary", label: "Changes", icon: "swap_horiz" },
  { id: "client", label: "User Input (raw)", icon: "arrow_downward" },
  { id: "llm", label: "LLM Payload (raw)", icon: "arrow_upward" },
  { id: "response", label: "Response", icon: "output" },
];

function DetailPanel({ detail, onClose }) {
  const [tab, setTab] = useState("diff");
  const { request: clientBody, providerRequest: llmBody, response, status, provider, model, latency, tokens } = detail;

  const clientMsgs = extractMessages(clientBody);
  const llmMsgs = extractMessages(llmBody);
  const clientTruncated = clientBody?._truncated;
  const llmTruncated = llmBody?._truncated;
  const hasDiff = clientMsgs.length !== llmMsgs.length;
  const { in: inTok, out: outTok } = getTokens(tokens);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex w-full max-w-5xl flex-col bg-bg border-l border-border-subtle shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 flex-shrink-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariant(status)} dot size="sm">{status || "unknown"}</Badge>
              <span className="font-mono text-sm font-medium text-text-main truncate max-w-xs">{model}</span>
              <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded">{provider}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
              <span title="Timestamp">{fmt(detail.timestamp)}</span>
              <span title="Time to first token">TTFT {fmtMs(latency?.ttft)}</span>
              <span title="Total latency">Total {fmtMs(latency?.total)}</span>
              <span className={cn("font-mono", inTok === 0 && outTok === 0 && "text-text-muted/50")}
                title="Input / output tokens">
                {inTok.toLocaleString()} in / {outTok.toLocaleString()} out tokens
              </span>
            </div>
            {(clientTruncated || llmTruncated) && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Icon name="warning" size={13} />
                Old data was truncated (old 5KB limit). New requests have been fixed — send more requests to view full details.
              </div>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="flex-shrink-0 flex items-center justify-center size-8 rounded-lg hover:bg-surface-2 transition-colors"
            aria-label="Close panel">
            <Icon name="close" size={20} className="text-text-muted" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0.5 border-b border-border-subtle px-4 py-2 flex-shrink-0 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                tab === t.id ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-surface-2 hover:text-text-main"
              )}>
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.id === "diff" && (
                <span className={cn(
                  "ml-1 px-1.5 rounded-full text-[10px] font-bold",
                  hasDiff ? "bg-amber-200 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200"
                          : "bg-surface-2 text-text-muted"
                )}>
                  {clientMsgs.length}→{llmMsgs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {tab === "diff" && <MessageDiff clientBody={clientBody} llmBody={llmBody} />}
          {tab === "summary" && <SummaryChanges clientBody={clientBody} llmBody={llmBody} />}
          {tab === "client" && <JsonViewer data={clientBody} label="Full user input (before itxbridge processing)" maxHeight="70vh" />}
          {tab === "llm" && <JsonViewer data={llmBody} label="Full payload sent to LLM provider" maxHeight="70vh" />}
          {tab === "response" && (
            <div className="flex flex-col gap-4">
              {response?.thinking && (
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Thinking / Reasoning</p>
                  <pre className="w-full overflow-auto rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 font-mono text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap break-words max-h-64">
                    {response.thinking}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Content</p>
                <pre className="w-full overflow-auto rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-white/[0.03] p-3 font-mono text-xs text-text-main whitespace-pre-wrap break-words max-h-[60vh]">
                  {typeof response === "string" ? response : (response?.content || response?.error || "(empty)")}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main list ───────────────────────────────────────────────────────────────

export default function RequestInspector() {
  const [details, setDetails] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ provider: "", status: "" });
  const [providers, setProviders] = useState([]);
  const [observabilityOff, setObservabilityOff] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const searchTimer = useRef(null);
  const refreshTimer = useRef(null);

  const handleSearchChange = (value) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 350);
  };

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/providers");
      const data = await res.json();
      setProviders(data.providers || []);
    } catch {}
  }, []);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (filters.provider) params.append("provider", filters.provider);
      if (filters.status) params.append("status", filters.status);

      const res = await fetch(`/api/usage/request-details?${params}`);
      const data = await res.json();
      let results = data.details || [];

      // Check if observability is off (no records at all)
      if (results.length === 0 && pagination.page === 1 && !filters.provider && !filters.status) {
        fetch("/api/settings").then((r) => r.json())
          .then((s) => setObservabilityOff(!s.enableObservability2))
          .catch(() => {});
      } else {
        setObservabilityOff(false);
      }

      // Client-side text search
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        results = results.filter((d) => {
          if (d.model?.toLowerCase().includes(q)) return true;
          if (d.provider?.toLowerCase().includes(q)) return true;
          const preview = extractUserPreview(d.request) || "";
          return preview.toLowerCase().includes(q);
        });
      }

      setDetails(results);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (err) {
      console.error("Failed to fetch request details:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters, debouncedSearch]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);
  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  // Auto-refresh every 5s when enabled
  useEffect(() => {
    if (!autoRefresh) { clearInterval(refreshTimer.current); return; }
    refreshTimer.current = setInterval(() => {
      setPagination((p) => ({ ...p })); // trigger fetchDetails via dep change
    }, 5000);
    return () => clearInterval(refreshTimer.current);
  }, [autoRefresh]);

  const handleEnableObservability = async () => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enableObservability2: true }),
    });
    setObservabilityOff(false);
    fetchDetails();
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Title */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-main">Request Inspector</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Compare user input vs the payload sent to each LLM — see exactly what itxbridge injects or modifies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((a) => !a)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
              autoRefresh
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-black/10 dark:border-white/10 text-text-muted hover:text-text-main hover:bg-surface-2"
            )}
          >
            <Icon name="refresh" size={15} className={cn(autoRefresh && "animate-spin")} />
            {autoRefresh ? "Live" : "Auto-refresh"}
          </button>
          <Button variant="ghost" onClick={fetchDetails} className="gap-1.5 text-sm">
            <Icon name="refresh" size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Observability disabled banner */}
      {observabilityOff && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-900/15 dark:border-amber-600/30 p-4">
          <Icon name="warning" size={20} className="text-amber-500  mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Observability is disabled</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Enable to start recording request details (input, translated payload, response). New requests only — past requests are not backfilled.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleEnableObservability}>Enable</Button>
        </div>
      )}

      {/* Filters */}
      <Card padding="md">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Search</label>
            <div className="relative">
              <Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2  text-text-muted pointer-events-none" />
              <input type="text" placeholder="Model, provider, message…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={cn(
                  "h-9 pl-8 pr-3 rounded-lg border border-black/10 dark:border-white/10 bg-surface",
                  "text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                )} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Provider</label>
            <select value={filters.provider}
              onChange={(e) => { setFilters((f) => ({ ...f, provider: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}
              className={cn("h-9 px-3 rounded-lg border border-black/10 dark:border-white/10 bg-surface text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer")}
              style={{ colorScheme: "auto" }}>
              <option value="">All Providers</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Status</label>
            <select value={filters.status}
              onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}
              className={cn("h-9 px-3 rounded-lg border border-black/10 dark:border-white/10 bg-surface text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer")}
              style={{ colorScheme: "auto" }}>
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wide">Time</th>
                <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wide">Model / Provider</th>
                <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wide">User Message Preview</th>
                <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wide">Msgs</th>
                <th className="text-right p-4 text-xs font-semibold text-text-muted uppercase tracking-wide">Tokens in/out</th>
                <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wide">Latency</th>
                <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-10 text-center text-text-muted">
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="progress_activity" size={20} className="animate-spin" />
                    Loading…
                  </div>
                </td></tr>
              ) : details.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-text-muted">
                  {observabilityOff ? "Enable observability above to start recording requests." : "No requests found."}
                </td></tr>
              ) : (
                details.map((d, i) => {
                  const preview = extractUserPreview(d.request);
                  const clientMsgCount = extractMessages(d.request).length;
                  const llmMsgCount = extractMessages(d.providerRequest).length;
                  const truncated = d.request?._truncated || d.providerRequest?._truncated;
                  const hasDiff = !truncated && clientMsgCount !== llmMsgCount;
                  const { in: inTok, out: outTok } = getTokens(d.tokens);

                  return (
                    <tr key={`${d.id}-${i}`}
                      className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelected(d)}>
                      <td className="whitespace-nowrap p-4 text-xs text-text-muted">{fmt(d.timestamp)}</td>
                      <td className="p-4 max-w-[180px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-text-main truncate">{d.model}</span>
                          <span className="text-[11px] text-text-muted">{d.provider}</span>
                        </div>
                      </td>
                      <td className="p-4 max-w-[260px]">
                        {truncated ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Icon name="warning" size={12} />
                            Old data (truncated)
                          </span>
                        ) : preview ? (
                          <span className="text-xs text-text-muted truncate block">{preview}{preview.length >= 150 ? "…" : ""}</span>
                        ) : (
                          <span className="text-xs text-text-muted italic">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {truncated ? (
                          <span className="text-xs text-text-muted/50">—</span>
                        ) : (
                          <span className={cn("font-mono text-xs",
                            hasDiff ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-text-muted")}>
                            {clientMsgCount}→{llmMsgCount}
                            {hasDiff && <Icon name="edit" size={11} className="ml-0.5  align-middle" />}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono text-xs text-text-muted whitespace-nowrap">
                        {inTok.toLocaleString()} / {outTok.toLocaleString()}
                      </td>
                      <td className="p-4 text-xs text-text-muted whitespace-nowrap">{fmtMs(d.latency?.total)}</td>
                      <td className="p-4 text-center">
                        <Badge variant={statusVariant(d.status)} size="sm" dot>{d.status || "?"}</Badge>
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(d); }}>
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && details.length > 0 && (
          <div className="border-t border-black/5 dark:border-white/5">
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              onPageSizeChange={(ps) => setPagination((prev) => ({ ...prev, pageSize: ps, page: 1 }))}
            />
          </div>
        )}
      </Card>

      {selected && <DetailPanel detail={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
