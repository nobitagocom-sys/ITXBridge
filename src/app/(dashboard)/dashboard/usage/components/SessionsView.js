"use client";

import { useState, useEffect, useMemo } from "react";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import Icon from "@/shared/components/Icon";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => (n != null && n > 0) ? `$${n.toFixed(4)}` : "$0.00";
const fmtShortCost = (n) => {
  if (!n || n === 0) return "$0";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
};

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Tool icon mapping - uses valid Material Symbol names from the Icon component
const TOOL_ICONS = {
  claude: "psychology",
  "claude-code": "psychology",
  "claude-cli": "psychology",
  codex: "terminal",
  "codex-cli": "terminal",
  "gemini-cli": "auto_awesome",
  antigravity: "rocket_launch",
  cursor: "edit",
  "github-copilot": "code",
  "deepseek-tui": "terminal",
  cody: "code",
  windsurf: "cloud",
  kiro: "science",
  copilot: "code",
};

function getToolIcon(clientTool) {
  if (!clientTool) return "smart_toy";
  return TOOL_ICONS[clientTool] || TOOL_ICONS[clientTool.toLowerCase()] || "smart_toy";
}

function getToolLabel(clientTool) {
  if (!clientTool) return "Unknown Agent";
  const map = {
    claude: "Claude Code",
    "claude-code": "Claude Code",
    "claude-cli": "Claude CLI",
    codex: "Codex",
    "codex-cli": "Codex CLI",
    "gemini-cli": "Gemini CLI",
    antigravity: "Antigravity",
    cursor: "Cursor",
    "github-copilot": "GitHub Copilot",
    "deepseek-tui": "DeepSeek TUI",
    cody: "Cody",
    windsurf: "Windsurf",
    kiro: "Kiro",
    copilot: "Copilot",
  };
  return map[clientTool] || map[clientTool.toLowerCase()] || clientTool;
}

// Session status badge
function SessionBadge({ status }) {
  const config = {
    active: { variant: "success", label: "Active", icon: "radio_button_checked" },
    idle: { variant: "warning", label: "Idle", icon: "radio_button_unchecked" },
    completed: { variant: "neutral", label: "Done", icon: "check_circle" },
  };
  const c = config[status] || config.completed;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
      status === "active" ? "bg-success/10 text-success" :
      status === "idle" ? "bg-warning/10 text-warning" :
      "bg-surface-2 text-text-muted"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-success animate-pulse" : status === "idle" ? "bg-warning" : "bg-text-muted"}`} />
      {c.label}
    </span>
  );
}

// Single session row
function SessionRow({ session }) {
  const [expanded, setExpanded] = useState(false);
  const hasModels = session.models && session.models.length > 0;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-subtle/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Tool icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
          <Icon name={getToolIcon(session.clientTool)} size={18} className="text-text-muted" />
        </div>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">
              {getToolLabel(session.clientTool)}
            </span>
            <SessionBadge status={session.status} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
            <span className="font-mono" title={session.sessionId}>
              {session.sessionId?.length > 20
                ? `${session.sessionId.slice(0, 12)}...${session.sessionId.slice(-8)}`
                : session.sessionId || "—"}
            </span>
            {session.userId && (
              <>
                <span>·</span>
                <span className="truncate max-w-[150px]" title={session.userId}>
                  {session.userId}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Active models */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {hasModels ? session.models.map((m, i) => (
            <Badge key={i} variant="primary" size="sm">
              {m.model}
              {m.count > 1 ? ` ×${m.count}` : ""}
            </Badge>
          )) : session.status === "active" ? (
            <span className="text-xs text-text-muted">—</span>
          ) : null}
        </div>

        {/* Token in/out */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0 text-xs">
          <span className="text-primary tabular-nums" title="Input tokens">
            {fmt(session.totalPromptTokens)}↑
          </span>
          <span className="text-success tabular-nums" title="Output tokens">
            {fmt(session.totalCompletionTokens)}↓
          </span>
        </div>

        {/* Cost */}
        <div className="hidden lg:block flex-shrink-0 text-xs font-mono text-warning tabular-nums w-16 text-right">
          {fmtShortCost(session.totalCost)}
        </div>

        {/* Request count */}
        <div className="hidden sm:block flex-shrink-0 text-xs text-text-muted tabular-nums w-12 text-right">
          {fmt(session.totalRequests)} req
        </div>

        {/* Last activity */}
        <div className="flex-shrink-0 text-[11px] text-text-muted w-16 text-right">
          {session.status === "active" ? (
            <span className="text-success">live</span>
          ) : (
            timeAgo(session.lastActivity)
          )}
        </div>

        {/* Expand chevron */}
        <Icon
          name={expanded ? "expand_less" : "expand_more"}
          size={18}
          className="text-text-muted flex-shrink-0"
        />
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 bg-bg-subtle/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-text-muted">Session ID</span>
              <p className="font-mono text-[11px] mt-0.5 break-all">{session.sessionId}</p>
            </div>
            <div>
              <span className="text-text-muted">Agent</span>
              <p className="mt-0.5">{getToolLabel(session.clientTool)}</p>
            </div>
            <div>
              <span className="text-text-muted">User</span>
              <p className="mt-0.5 truncate" title={session.userId}>{session.userId || "—"}</p>
            </div>
            <div>
              <span className="text-text-muted">Connection</span>
              <p className="font-mono text-[11px] mt-0.5 truncate" title={session.connectionId}>
                {session.connectionId ? `${session.connectionId.slice(0, 12)}...` : "—"}
              </p>
            </div>
            <div>
              <span className="text-text-muted">Tokens In</span>
              <p className="text-primary mt-0.5">{fmt(session.totalPromptTokens)}</p>
            </div>
            <div>
              <span className="text-text-muted">Tokens Out</span>
              <p className="text-success mt-0.5">{fmt(session.totalCompletionTokens)}</p>
            </div>
            <div>
              <span className="text-text-muted">Total Cost</span>
              <p className="text-warning mt-0.5">{fmtCost(session.totalCost)}</p>
            </div>
            <div>
              <span className="text-text-muted">Active Requests</span>
              <p className="mt-0.5">{session.activeCount}</p>
            </div>
            {hasModels && (
              <div className="col-span-2 sm:col-span-4">
                <span className="text-text-muted">Active Models</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {session.models.map((m, i) => (
                    <Badge key={i} variant="primary" size="sm">
                      {m.model} ({m.provider})
                      {m.count > 1 ? ` ×${m.count}` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionsView({ sessions = [], loading = false }) {
  const activeSessions = useMemo(() => sessions.filter((s) => s.status === "active"), [sessions]);
  const idleSessions = useMemo(() => sessions.filter((s) => s.status === "idle"), [sessions]);
  const completedSessions = useMemo(() => sessions.filter((s) => s.status === "completed"), [sessions]);

  const totalCost = useMemo(() => sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0), [sessions]);
  const totalTokens = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.totalPromptTokens || 0) + (s.totalCompletionTokens || 0), 0),
    [sessions]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <Icon name="progress_activity" size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="flex flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-xs uppercase font-semibold">Active Sessions</span>
          <span className="text-xl font-bold text-success">{activeSessions.length}</span>
        </Card>
        <Card className="flex flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-xs uppercase font-semibold">Idle</span>
          <span className="text-xl font-bold text-warning">{idleSessions.length}</span>
        </Card>
        <Card className="flex flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-xs uppercase font-semibold">Session Tokens</span>
          <span className="text-xl font-bold">{fmt(totalTokens)}</span>
        </Card>
        <Card className="flex flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-xs uppercase font-semibold">Session Cost</span>
          <span className="text-xl font-bold text-warning">{fmtShortCost(totalCost)}</span>
        </Card>
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <Card className="flex min-w-0 flex-col overflow-hidden" padding="none">
          <div className="px-4 py-2.5 border-b border-border bg-success/5">
            <span className="text-xs font-semibold text-success uppercase tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Active Sessions ({activeSessions.length})
            </span>
          </div>
          {activeSessions.map((s) => (
            <SessionRow key={s.sessionId} session={s} />
          ))}
        </Card>
      )}

      {/* Idle sessions */}
      {idleSessions.length > 0 && (
        <Card className="flex min-w-0 flex-col overflow-hidden" padding="none">
          <div className="px-4 py-2.5 border-b border-border bg-warning/5">
            <span className="text-xs font-semibold text-warning uppercase tracking-wide">
              Recently Idle ({idleSessions.length})
            </span>
          </div>
          {idleSessions.map((s) => (
            <SessionRow key={s.sessionId} session={s} />
          ))}
        </Card>
      )}

      {/* Completed (historical) sessions */}
      {completedSessions.length > 0 && (
        <Card className="flex min-w-0 flex-col overflow-hidden" padding="none">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Historical Sessions ({completedSessions.length})
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {completedSessions.map((s) => (
              <SessionRow key={s.sessionId} session={s} />
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 gap-3">
          <Icon name="smart_toy" size={48} className="text-text-muted/40" />
          <div className="text-center">
            <p className="text-text-muted font-medium">No sessions recorded yet</p>
            <p className="text-text-muted/60 text-sm mt-1">
              Active sessions will appear here when AI tools make requests through the proxy
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
