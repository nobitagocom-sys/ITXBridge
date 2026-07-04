"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon,  Card, Toggle } from "@/shared/components";
import {
  FEATURES,
  estimateTokens,
  formatTokens,
  savingsPct,
  QUALITY_SCORES,
  GUARDRAILS,
  RECOMMENDATIONS,
} from "./SimulationData";

// --- Color palette ---
const COLORS = {
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  emerald: "#10b981",
  red: "#ef4444",
  gray: "#6b7280",
  green: "#22c55e",
  slate: "#64748b",
};

// --- Mini Bar Chart Component ---
function TokenBar({ before, after, label, maxVal, color }) {
  const pctBefore = maxVal > 0 ? (before / maxVal) * 100 : 0;
  const pctAfter = maxVal > 0 ? (after / maxVal) * 100 : 0;
  const saved = before - after;
  const pct = savingsPct(before, after);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-text-muted">{label}</span>
        <span className="font-mono text-text">
          {formatTokens(before)} → {formatTokens(after)}
          {saved > 0 && (
            <span className="ml-2 text-success font-semibold">
              -{pct}% ({formatTokens(saved)})
            </span>
          )}
        </span>
      </div>
      <div className="relative h-4 bg-surface-2 rounded overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded transition-all duration-700"
          style={{
            width: `${pctBefore}%`,
            backgroundColor: color + "44",
            borderRight: `2px solid ${color}`,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded transition-all duration-700"
          style={{
            width: `${pctAfter}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// --- Token Stat Card ---
function TokenStat({ label, value, color, suffix }) {
  return (
    <div className="flex flex-col items-center p-3 bg-surface-1 rounded-lg border border-border min-w-[100px]">
      <span className="text-xs text-text-muted mb-1">{label}</span>
      <span className="text-lg font-bold font-mono" style={{ color }}>
        {typeof value === "number" ? formatTokens(value) : value}
        {suffix && <span className="text-xs ml-1 text-text-muted">{suffix}</span>}
      </span>
    </div>
  );
}

// --- Code Panel (for input/output display) ---
function CodePanel({ title, content, maxHeight, badge, badgeColor, defaultCollapsed }) {
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2 bg-surface-1 hover:bg-surface-2 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name={collapsed ? "chevron_right" : "expand_more"} size={14} className="text-text-muted" />
          <span className="text-sm font-medium text-text">{title}</span>
          {badge && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono text-white"
              style={{ backgroundColor: badgeColor || COLORS.gray }}
            >
              {badge}
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-muted font-mono">
          {formatTokens(estimateTokens(content))} tokens
        </span>
      </button>
      {!collapsed && (
        <div
          className="overflow-auto border-t border-border"
          style={{ maxHeight: maxHeight || 400 }}
        >
          <pre className="p-4 text-xs font-mono text-text leading-relaxed whitespace-pre-wrap break-all">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

// --- Message List Panel ---
function MessagesPanel({ title, messages, maxHeight, badge, badgeColor, defaultCollapsed }) {
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);
  const totalTokens = messages.reduce((sum, m) => {
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    return sum + estimateTokens(content);
  }, 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2 bg-surface-1 hover:bg-surface-2 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon name={collapsed ? "chevron_right" : "expand_more"} size={14} className="text-text-muted" />
          <span className="text-sm font-medium text-text">{title}</span>
          {badge && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono text-white"
              style={{ backgroundColor: badgeColor || COLORS.gray }}
            >
              {badge}
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-muted font-mono">
          {messages.length} msgs · {formatTokens(totalTokens)} tokens
        </span>
      </button>
      {!collapsed && (
        <div
          className="overflow-auto border-t border-border"
          style={{ maxHeight: maxHeight || 400 }}
        >
          <div className="p-3 space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded p-2 text-xs border ${
                  msg.role === "system"
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    : msg.role === "user"
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                      : msg.role === "assistant"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      msg.role === "system"
                        ? "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                        : msg.role === "user"
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          : msg.role === "assistant"
                            ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                            : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                    }`}
                  >
                    {msg.role}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    ~{formatTokens(estimateTokens(typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)))} tokens
                  </span>
                  {msg.tool_calls && (
                    <span className="text-[10px] text-primary font-medium">
                      +{msg.tool_calls.length} tool calls
                    </span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap text-text leading-relaxed font-mono">
                  {typeof msg.content === "string"
                    ? msg.content.length > 500
                      ? msg.content.slice(0, 500) + "\n... (truncated)"
                      : msg.content
                    : JSON.stringify(msg.content, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Savings Badge ---
function SavingsBadge({ before, after }) {
  const saved = before - after;
  const pct = savingsPct(before, after);
  if (saved <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded">
      <Icon name="trending_down" size={18} className="text-sm" />
      -{pct}% (tiết kiệm {formatTokens(saved)} tokens)
    </span>
  );
}

// ============================================================================
// RTK Tab Content
// ============================================================================
function RtkTab() {
  const [activeSubCase, setActiveSubCase] = useState("gitDiff");
  const feature = FEATURES.rtk;

  const subCase = feature.subCases.find((s) => s.id === activeSubCase);
  const allInputTokens = feature.subCases.reduce((sum, s) => sum + s.inputTokens, 0);
  const allOutputTokens = feature.subCases.reduce((sum, s) => sum + s.outputTokens, 0);

  return (
    <div className="space-y-6">
      {/* Feature description */}
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: feature.color, backgroundColor: feature.color + "10" }}
      >
        <div className="flex items-start gap-3">
          <Icon name={feature.icon} size={24} style={{  color: feature.color  }} />
          <div>
            <h3 className="font-semibold text-text mb-1">{feature.label}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
          </div>
        </div>
      </div>

      {/* Overall stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <TokenStat label="Total Input Tokens (5 cases)" value={allInputTokens} color={COLORS.slate} />
        <TokenStat label="Total Output Tokens (5 cases)" value={allOutputTokens} color={feature.color} />
        <TokenStat
          label="Average Savings"
          value={`${savingsPct(allInputTokens, allOutputTokens)}%`}
          color={COLORS.green}
        />
      </div>

      {/* Overall bar */}
      <TokenBar
        before={allInputTokens}
        after={allOutputTokens}
        label="Aggregate of 5 sub-cases"
        maxVal={allInputTokens}
        color={feature.color}
      />

      {/* Sub-case selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {feature.subCases.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => setActiveSubCase(sc.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              activeSubCase === sc.id
                ? "text-white border-transparent"
                : "bg-transparent border-border text-text-muted hover:bg-surface-2"
            }`}
            style={activeSubCase === sc.id ? { backgroundColor: feature.color, borderColor: feature.color } : {}}
          >
            {sc.label}
          </button>
        ))}
      </div>

      {/* Current sub-case detail */}
      {subCase && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-text mb-1">{subCase.label}</h4>
            <p className="text-xs text-text-muted">{subCase.description}</p>
          </div>

          {/* Token comparison cards */}
          <div className="flex items-center gap-3 flex-wrap">
            <TokenStat label="Input Tokens" value={subCase.inputTokens} color={COLORS.slate} />
            <div className="flex items-center text-text-muted">
              <Icon name="arrow_forward" />
            </div>
            <TokenStat label="Output Tokens" value={subCase.outputTokens} color={feature.color} />
            <SavingsBadge before={subCase.inputTokens} after={subCase.outputTokens} />
          </div>

          <TokenBar
            before={subCase.inputTokens}
            after={subCase.outputTokens}
            label={`${subCase.label}: token count`}
            maxVal={subCase.inputTokens}
            color={feature.color}
          />

          {/* Input/Output panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CodePanel
              title={`INPUT — ${subCase.inputLabel}`}
              content={subCase.input}
              badge={`${formatTokens(subCase.inputTokens)} tokens`}
              badgeColor={COLORS.slate}
            />
            <CodePanel
              title={`OUTPUT — After RTK Compress`}
              content={subCase.output}
              badge={`${formatTokens(subCase.outputTokens)} tokens`}
              badgeColor={feature.color}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Headroom Tab Content
// ============================================================================
function HeadroomTab() {
  const feature = FEATURES.headroom;
  const [showInput, setShowInput] = useState(true);
  const [showOutput, setShowOutput] = useState(true);

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: feature.color, backgroundColor: feature.color + "10" }}
      >
        <div className="flex items-start gap-3">
          <Icon name={feature.icon} size={24} style={{  color: feature.color  }} />
          <div>
            <h3 className="font-semibold text-text mb-1">{feature.label}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
          </div>
        </div>
      </div>

      {/* Token comparison */}
      <div className="flex items-center gap-4 flex-wrap">
        <TokenStat label="Input Tokens" value={feature.inputTokens} color={COLORS.slate} />
        <div className="flex items-center text-text-muted">
          <Icon name="arrow_forward" />
        </div>
        <TokenStat label="Output Tokens" value={feature.outputTokens} color={feature.color} />
        <SavingsBadge before={feature.inputTokens} after={feature.outputTokens} />
      </div>

      <TokenBar
        before={feature.inputTokens}
        after={feature.outputTokens}
        label="Headroom: token count"
        maxVal={feature.inputTokens}
        color={feature.color}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold text-text">{feature.inputMessages.length}</div>
          <div className="text-xs text-text-muted">Original messages</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold text-text">{feature.outputMessages.length}</div>
          <div className="text-xs text-text-muted">Messages after compression</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold text-text">
            {estimateTokens(JSON.stringify(feature.inputMessages))}
          </div>
          <div className="text-xs text-text-muted">Original body size</div>
        </div>
        <div className="p-3 bg-surface-1 rounded-lg border border-border text-center">
          <div className="text-lg font-bold text-success">
            {estimateTokens(JSON.stringify(feature.outputMessages))}
          </div>
          <div className="text-xs text-text-muted">Body size after compression</div>
        </div>
      </div>

      {/* Toggle buttons */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setShowInput(!showInput)}
          className={`text-xs px-3 py-1.5 rounded border transition-colors ${
            showInput ? "bg-slate-100 dark:bg-slate-800 border-slate-300" : "border-border text-text-muted"
          }`}
        >
          {showInput ? "Hide" : "Show"} Input
        </button>
        <button
          type="button"
          onClick={() => setShowOutput(!showOutput)}
          className={`text-xs px-3 py-1.5 rounded border transition-colors ${
            showOutput ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300" : "border-border text-text-muted"
          }`}
        >
          {showOutput ? "Hide" : "Show"} Output
        </button>
      </div>

      {/* Messages panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showInput && (
          <MessagesPanel
            title="INPUT — Original conversation (16 messages)"
            messages={feature.inputMessages}
            badge={`${formatTokens(feature.inputTokens)} tokens`}
            badgeColor={COLORS.slate}
          />
        )}
        {showOutput && (
          <MessagesPanel
            title="OUTPUT — After Headroom Compress"
            messages={feature.outputMessages}
            badge={`${formatTokens(feature.outputTokens)} tokens`}
            badgeColor={feature.color}
          />
        )}
      </div>

      {/* Highlight what changed */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-2">
          <Icon name="lightbulb" size={14} className="mr-1" style={{  color: feature.color  }} />
          What changed?
        </h4>
        <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
          <li>First 14 messages (entire Fibonacci conversation) compressed into <strong>1 message summary</strong></li>
          <li>System message is <strong>kept as-is</strong> (important for context)</li>
          <li>Last message (binary search) is <strong>kept as-is</strong> (current question)</li>
          <li>Total: <strong>16 messages → 3 messages</strong>, reduced by <strong>{savingsPct(feature.inputTokens, feature.outputTokens)}%</strong> tokens</li>
        </ul>
      </Card>
    </div>
  );
}

// ============================================================================
// Caveman Tab Content
// ============================================================================
function CavemanTab() {
  const feature = FEATURES.caveman;
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: feature.color, backgroundColor: feature.color + "10" }}
      >
        <div className="flex items-start gap-3">
          <Icon name={feature.icon} size={24} style={{  color: feature.color  }} />
          <div>
            <h3 className="font-semibold text-text mb-1">{feature.label}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
          </div>
        </div>
      </div>

      {/* System prompt toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Icon name={showSystemPrompt ? "expand_less" : "expand_more"} size={14} />
          Injected System Prompt (Caveman Full):
        </button>
        {showSystemPrompt && (
          <pre className="mt-2 p-3 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-text leading-relaxed whitespace-pre-wrap">
            {feature.systemPrompt}
          </pre>
        )}
      </div>

      {/* Input prompt */}
      <Card>
        <h4 className="text-xs font-semibold text-text-muted mb-2 uppercase">User Prompt:</h4>
        <p className="text-sm text-text font-medium">{feature.inputPrompt}</p>
        <p className="text-xs text-text-muted mt-1">
          ~{formatTokens(estimateTokens(feature.inputPrompt))} input tokens
        </p>
      </Card>

      {/* Level comparison cards */}
      <div className="space-y-6">
        {feature.levels.map((level, idx) => {
          const baselineTokens = feature.levels[0].outputTokens;
          const saved = baselineTokens - level.outputTokens;
          const pct = savingsPct(baselineTokens, level.outputTokens);

          return (
            <div key={level.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-surface-1">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: level.id === "off" ? COLORS.slate : feature.color }}
                  >
                    {level.label}
                  </span>
                  <span className="text-sm font-medium text-text">{level.level}</span>
                  <span className="text-xs text-text-muted hidden sm:inline">— {level.levelNote}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text">
                    {formatTokens(level.outputTokens)} tokens
                  </span>
                  {idx > 0 && (
                    <span className="text-xs font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">
                      -{pct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <pre className="text-xs font-mono text-text leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-auto">
                  {level.output}
                </pre>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison chart */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-4">Output Token Comparison</h4>
        {feature.levels.map((level) => {
          const baselineTokens = feature.levels[0].outputTokens;
          const pct = baselineTokens > 0 ? (level.outputTokens / baselineTokens) * 100 : 0;
          return (
            <div key={level.id} className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-muted">
                  {level.label} — {level.level}
                </span>
                <span className="font-mono text-text">{formatTokens(level.outputTokens)} tokens</span>
              </div>
              <div className="h-5 bg-surface-2 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-700 flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: level.id === "off" ? COLORS.slate : feature.color,
                  }}
                >
                  {pct > 10 && (
                    <span className="text-[10px] text-white font-mono">
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ============================================================================
// Ponytail Tab Content
// ============================================================================
function PonytailTab() {
  const feature = FEATURES.ponytail;
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [activeLevel, setActiveLevel] = useState(null);

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: feature.color, backgroundColor: feature.color + "10" }}
      >
        <div className="flex items-start gap-3">
          <Icon name={feature.icon} size={24} style={{  color: feature.color  }} />
          <div>
            <h3 className="font-semibold text-text mb-1">{feature.label}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
          </div>
        </div>
      </div>

      {/* System prompt toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Icon name={showSystemPrompt ? "expand_less" : "expand_more"} size={14} />
          Injected System Prompt (Ponytail Full):
        </button>
        {showSystemPrompt && (
          <pre className="mt-2 p-3 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-text leading-relaxed whitespace-pre-wrap">
            {feature.systemPrompt}
          </pre>
        )}
      </div>

      {/* Input prompt */}
      <Card>
        <h4 className="text-xs font-semibold text-text-muted mb-2 uppercase">User Prompt:</h4>
        <p className="text-sm text-text font-medium">{feature.inputPrompt}</p>
        <p className="text-xs text-text-muted mt-1">
          ~{formatTokens(estimateTokens(feature.inputPrompt))} input tokens
        </p>
      </Card>

      {/* Level selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {feature.levels.map((level) => {
          const baselineTokens = feature.levels[0].outputTokens;
          const saved = baselineTokens - level.outputTokens;
          const pct = savingsPct(baselineTokens, level.outputTokens);
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => setActiveLevel(activeLevel === level.id ? null : level.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                activeLevel === level.id
                  ? "text-white border-transparent"
                  : "bg-transparent border-border text-text-muted hover:bg-surface-2"
              }`}
              style={activeLevel === level.id ? { backgroundColor: feature.color, borderColor: feature.color } : {}}
            >
              {level.label} ({formatTokens(level.outputTokens)} tok
              {level.id !== "off" && `, -${pct}%`})
            </button>
          );
        })}
      </div>

      {/* Active level detail */}
      {activeLevel && (() => {
        const level = feature.levels.find((l) => l.id === activeLevel);
        if (!level) return null;
        const baselineTokens = feature.levels[0].outputTokens;

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <TokenStat label="Output Tokens" value={level.outputTokens} color={feature.color} />
              {level.id !== "off" && (
                <SavingsBadge before={baselineTokens} after={level.outputTokens} />
              )}
              <span className="text-xs text-text-muted">{level.levelNote}</span>
            </div>

            <TokenBar
              before={baselineTokens}
              after={level.outputTokens}
              label={`${level.label}: vs Baseline`}
              maxVal={baselineTokens}
              color={feature.color}
            />

            <CodePanel
              title={`OUTPUT — ${level.level}`}
              content={level.output}
              badge={`${formatTokens(level.outputTokens)} tokens`}
              badgeColor={feature.color}
              maxHeight={600}
            />
          </div>
        );
      })()}

      {/* Full comparison chart */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-4">Output Token + Lines of Code Comparison</h4>
        {feature.levels.map((level) => {
          const baselineTokens = feature.levels[0].outputTokens;
          const pct = baselineTokens > 0 ? (level.outputTokens / baselineTokens) * 100 : 0;
          const codeLines = (level.output.match(/\n/g) || []).length + 1;
          return (
            <div key={level.id} className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted font-medium">{level.label}</span>
                  <span className="text-text-muted">—</span>
                  <span className="text-text">{level.level}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-text-muted">{codeLines} lines</span>
                  <span className="text-text">{formatTokens(level.outputTokens)} tok</span>
                </div>
              </div>
              <div className="h-5 bg-surface-2 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-700 flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: level.id === "off" ? COLORS.slate : feature.color,
                  }}
                >
                  {pct > 10 && (
                    <span className="text-[10px] text-white font-mono">{Math.round(pct)}%</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Key differences */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-2">
          <Icon name="difference" size={14} className="mr-1" style={{  color: feature.color  }} />
          Key Differences
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-2 pr-4 font-medium">Criteria</th>
                <th className="text-left py-2 px-3 font-medium">Baseline</th>
                <th className="text-left py-2 px-3 font-medium">Ponytail Full</th>
                <th className="text-left py-2 px-3 font-medium">Ponytail Ultra</th>
              </tr>
            </thead>
            <tbody className="text-text">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 text-text-muted">Lines of code</td>
                <td className="py-2 px-3 font-mono">~110</td>
                <td className="py-2 px-3 font-mono">~18</td>
                <td className="py-2 px-3 font-mono">~8</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 text-text-muted">Class/Interface</td>
                <td className="py-2 px-3">Has class + types</td>
                <td className="py-2 px-3">Class, no types</td>
                <td className="py-2 px-3">No class</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 text-text-muted">Dependencies</td>
                <td className="py-2 px-3">0 (fetch)</td>
                <td className="py-2 px-3">0 (fetch)</td>
                <td className="py-2 px-3">0 (fetch)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 text-text-muted">Retry logic</td>
                <td className="py-2 px-3">✓ (exponential backoff)</td>
                <td className="py-2 px-3">✗ (skipped)</td>
                <td className="py-2 px-3">✗ (skipped)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 text-text-muted">Logger class</td>
                <td className="py-2 px-3">✓ (dedicated class)</td>
                <td className="py-2 px-3">✗ (skipped)</td>
                <td className="py-2 px-3">✗ (skipped)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-text-muted">Ponytail comment</td>
                <td className="py-2 px-3">—</td>
                <td className="py-2 px-3 text-success">✓ marked</td>
                <td className="py-2 px-3 text-success">✓ marked</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Combined Tab Content
// ============================================================================
function CombinedTab() {
  const feature = FEATURES.combined;
  const scenario = feature.scenario;

  const stages = [
    { key: "baseline", label: "Baseline", desc: "All OFF", color: COLORS.slate },
    { key: "rtkOnly", label: "+ RTK", desc: "RTK ON", color: COLORS.blue },
    { key: "rtkHeadroom", label: "+ Headroom", desc: "RTK + Headroom", color: COLORS.purple },
    { key: "rtkHeadroomCaveman", label: "+ Caveman", desc: "+ Caveman Full", color: COLORS.amber },
    { key: "rtkHeadroomCavemanPonytail", label: "+ Ponytail", desc: "+ Ponytail Full", color: COLORS.emerald },
    { key: "maxSave", label: "Max Save", desc: "All Ultra", color: COLORS.red },
  ];

  const maxInput = Math.max(...stages.map((s) => scenario[s.key].inputTokens));
  const maxOutput = Math.max(...stages.map((s) => scenario[s.key].outputTokens));
  const maxTotal = Math.max(...stages.map((s) => scenario[s.key].totalTokens));
  const baselineTotal = scenario.baseline.totalTokens;

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: feature.color, backgroundColor: feature.color + "10" }}
      >
        <div className="flex items-start gap-3">
          <Icon name={feature.icon} size={24} style={{  color: feature.color  }} />
          <div>
            <h3 className="font-semibold text-text mb-1">{feature.label}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map((stage) => {
          const data = scenario[stage.key];
          const pctOfBaseline = Math.round((data.totalTokens / baselineTotal) * 100);
          return (
            <div
              key={stage.key}
              className="p-3 rounded-lg border text-center"
              style={{ borderColor: stage.color + "44", backgroundColor: stage.color + "10" }}
            >
              <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: stage.color }}>
                {stage.label}
              </div>
              <div className="text-lg font-bold font-mono text-text">
                {formatTokens(data.totalTokens)}
              </div>
              <div className="text-[10px] text-text-muted">
                {stage.key === "baseline" ? "100% baseline" : `${pctOfBaseline}% baseline`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total token bar comparison */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-4">Total Tokens (Input + Output)</h4>
        {stages.map((stage) => {
          const data = scenario[stage.key];
          const pct = baselineTotal > 0 ? (data.totalTokens / baselineTotal) * 100 : 0;
          return (
            <div key={stage.key} className="mb-2.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: stage.color }} />
                  <span className="text-text font-medium">{stage.desc}</span>
                  <span className="text-text-muted hidden sm:inline">— {data.description}</span>
                </div>
                <span className="font-mono text-text font-semibold">
                  {formatTokens(data.totalTokens)} tok
                  {stage.key !== "baseline" && (
                    <span className="ml-1.5 text-success">
                      -{savingsPct(baselineTotal, data.totalTokens)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="h-6 bg-surface-2 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-700 flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: stage.color,
                  }}
                >
                  {pct > 15 && (
                    <span className="text-[10px] text-white font-mono font-bold">
                      {Math.round(pct)}% baseline
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Input vs Output breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h4 className="text-sm font-semibold text-text mb-4">Input Tokens</h4>
          {stages.map((stage) => {
            const data = scenario[stage.key];
            const pct = maxInput > 0 ? (data.inputTokens / maxInput) * 100 : 0;
            return (
              <div key={stage.key} className="mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted">{stage.desc}</span>
                  <span className="font-mono text-text">{formatTokens(data.inputTokens)}</span>
                </div>
                <div className="h-4 bg-surface-2 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            );
          })}
        </Card>
        <Card>
          <h4 className="text-sm font-semibold text-text mb-4">Output Tokens</h4>
          {stages.map((stage) => {
            const data = scenario[stage.key];
            const pct = maxOutput > 0 ? (data.outputTokens / maxOutput) * 100 : 0;
            return (
              <div key={stage.key} className="mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted">{stage.desc}</span>
                  <span className="font-mono text-text">{formatTokens(data.outputTokens)}</span>
                </div>
                <div className="h-4 bg-surface-2 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Detailed breakdown table */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-4">Detailed Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-2 pr-4 font-medium">Configuration</th>
                <th className="text-right py-2 px-2 font-medium">Input Tokens</th>
                <th className="text-right py-2 px-2 font-medium">Output Tokens</th>
                <th className="text-right py-2 px-2 font-medium">Total Tokens</th>
                <th className="text-right py-2 px-2 font-medium">% Baseline</th>
                <th className="text-right py-2 pl-2 font-medium">Savings</th>
              </tr>
            </thead>
            <tbody className="text-text">
              {stages.map((stage, idx) => {
                const data = scenario[stage.key];
                const pctOfBaseline = Math.round((data.totalTokens / baselineTotal) * 100);
                const totalSaved = baselineTotal - data.totalTokens;
                return (
                  <tr key={stage.key} className="border-b border-border/30 hover:bg-surface-1 transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: stage.color }} />
                        <span className="font-medium">{stage.desc}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatTokens(data.inputTokens)}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatTokens(data.outputTokens)}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold">{formatTokens(data.totalTokens)}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{pctOfBaseline}%</td>
                    <td className="py-2.5 pl-2 text-right">
                      {idx === 0 ? (
                        <span className="text-text-muted">—</span>
                      ) : (
                        <span className="text-success font-semibold">
                          -{formatTokens(totalSaved)} tok
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Max savings highlight */}
      <div
        className="rounded-lg p-4 border-2 text-center"
        style={{ borderColor: COLORS.green, backgroundColor: COLORS.green + "10" }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Icon name="savings" size={18} className="text-success" />
          <span className="text-lg font-bold text-success">
            Max savings: {formatTokens(baselineTotal - scenario.maxSave.totalTokens)} tokens ({savingsPct(baselineTotal, scenario.maxSave.totalTokens)}%)
          </span>
        </div>
        <p className="text-xs text-text-muted">
          From {formatTokens(baselineTotal)} tokens (baseline) down to {formatTokens(scenario.maxSave.totalTokens)} tokens (Max Save) —
          reducing {Math.round(100 - (scenario.maxSave.totalTokens / baselineTotal) * 100)}% total token cost
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Quality Impact Tab Content
// ============================================================================
function QualityImpactTab() {
  const [activeSection, setActiveSection] = useState("caveman");

  const sections = [
    { id: "caveman", label: "Caveman Quality", icon: "auto_awesome", color: "#f59e0b" },
    { id: "ponytail", label: "Ponytail Quality", icon: "psychology", color: "#10b981" },
    { id: "guardrails", label: "Guardrails", icon: "shield", color: "#ef4444" },
    { id: "recommendations", label: "Recommendations", icon: "lightbulb", color: "#3b82f6" },
  ];

  return (
    <div className="space-y-6">
      {/* Section navigation */}
      <div className="flex items-center gap-1 p-1 bg-surface-1 rounded-lg border border-border overflow-x-auto">
        {sections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeSection === sec.id
                ? "text-white shadow-sm"
                : "text-text-muted hover:text-text hover:bg-surface-2"
            }`}
            style={activeSection === sec.id ? { backgroundColor: sec.color } : {}}
          >
            <Icon name={sec.icon} size={14} />
            {sec.label}
          </button>
        ))}
      </div>

      {activeSection === "caveman" && <CavemanQualitySection />}
      {activeSection === "ponytail" && <PonytailQualitySection />}
      {activeSection === "guardrails" && <GuardrailsSection />}
      {activeSection === "recommendations" && <RecommendationsSection />}
    </div>
  );
}

// --- Caveman Quality Section ---
function CavemanQualitySection() {
  const data = QUALITY_SCORES.caveman;
  const [showExample, setShowExample] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: "#f59e0b", backgroundColor: "#f59e0b10" }}
      >
        <h3 className="font-semibold text-text mb-1">{data.title}</h3>
        <p className="text-sm text-text-muted">{data.description}</p>
        <p className="text-xs text-text-muted mt-2 font-mono">Prompt: "{data.prompt}"</p>
      </div>

      {/* Radar-style quality score cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data.levels.map((level) => (
          <Card key={level.id}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: level.color }}
                >
                  {level.label}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {formatTokens(level.outputTokens)} tokens
                </span>
              </div>
            </div>

            {/* Score bars */}
            <div className="space-y-2">
              {data.dimensions.map((dim) => {
                const score = level.scores[dim.key] || 0;
                return (
                  <div key={dim.key}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-text-muted flex items-center gap-1">
                        <Icon name={dim.icon} size={14} />
                        {dim.label}
                      </span>
                      <span className="font-mono text-text">{score}/5</span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(score / 5) * 100}%`,
                          backgroundColor:
                            score >= 4 ? "#22c55e" : score >= 3 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Highlights */}
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div>
                <span className="text-[10px] font-semibold text-success uppercase">✅ Kept</span>
                <ul className="text-[10px] text-text-muted mt-1 space-y-0.5 list-disc list-inside">
                  {level.highlights.kept.slice(0, 4).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                  {level.highlights.kept.length > 4 && (
                    <li className="text-text-muted/60">+{level.highlights.kept.length - 4} more...</li>
                  )}
                </ul>
              </div>
              {level.highlights.lost.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-red-400 uppercase">❌ Dropped/Lost</span>
                  <ul className="text-[10px] text-text-muted mt-1 space-y-0.5 list-disc list-inside">
                    {level.highlights.lost.slice(0, 4).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {level.highlights.risk && (
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-[10px] text-red-700 dark:text-red-300">
                  {level.highlights.risk}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Visual comparison chart */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-4">Quality Comparison by Dimension</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-2 pr-4 font-medium">Dimension</th>
                {data.levels.map((l) => (
                  <th key={l.id} className="text-center py-2 px-3 font-medium">{l.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-text">
              {data.dimensions.map((dim) => (
                <tr key={dim.key} className="border-b border-border/30">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Icon name={dim.icon} size={14} className="text-text-muted" />
                      <span className="font-medium">{dim.label}</span>
                    </div>
                  </td>
                  {data.levels.map((l) => {
                    const score = l.scores[dim.key] || 0;
                    return (
                      <td key={l.id} className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div
                                key={n}
                                className={`w-2 h-2 rounded-full ${
                                  n <= score
                                    ? score >= 4
                                      ? "bg-green-500"
                                      : score >= 3
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                    : "bg-surface-3"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-[10px] w-3">{score}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Concrete A/B comparison */}
      <div>
        <button
          type="button"
          onClick={() => setShowExample(!showExample)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Icon name={showExample ? "expand_less" : "expand_more"} size={14} />
          {data.concreteExample.title}
        </button>
        {showExample && (
          <div className="mt-3 space-y-6">
            {data.concreteExample.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h5 className="text-sm font-semibold text-text">{section.label}</h5>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="p-3 rounded border border-border bg-surface-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">OFF (Baseline)</span>
                    <pre className="mt-1 text-[10px] font-mono text-text leading-relaxed whitespace-pre-wrap">{section.off}</pre>
                  </div>
                  <div className="p-3 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                    <span className="text-[10px] font-semibold text-amber-600 uppercase">Caveman Full</span>
                    <pre className="mt-1 text-[10px] font-mono text-text leading-relaxed whitespace-pre-wrap">{section.full}</pre>
                  </div>
                  <div className="p-3 rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                    <span className="text-[10px] font-semibold text-red-500 uppercase">Caveman Ultra</span>
                    <pre className="mt-1 text-[10px] font-mono text-text leading-relaxed whitespace-pre-wrap">{section.ultra}</pre>
                  </div>
                </div>
                <p className="text-xs text-text-muted italic bg-surface-1 p-2 rounded">
                  💡 {section.annotation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Ponytail Quality Section ---
function PonytailQualitySection() {
  const data = QUALITY_SCORES.ponytail;
  const [showExample, setShowExample] = useState(false);

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: "#10b981", backgroundColor: "#10b98110" }}
      >
        <h3 className="font-semibold text-text mb-1">{data.title}</h3>
        <p className="text-sm text-text-muted">{data.description}</p>
        <p className="text-xs text-text-muted mt-2 font-mono">Prompt: "{data.prompt.slice(0, 100)}..."</p>
      </div>

      {/* Quality score cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data.levels.map((level) => (
          <Card key={level.id}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: level.color }}
                >
                  {level.label}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {formatTokens(level.outputTokens)} tok
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {data.dimensions.map((dim) => {
                const score = level.scores[dim.key] || 0;
                return (
                  <div key={dim.key}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-text-muted flex items-center gap-1">
                        <Icon name={dim.icon} size={14} />
                        {dim.label}
                      </span>
                      <span className="font-mono text-text">{score}/5</span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(score / 5) * 100}%`,
                          backgroundColor:
                            score >= 4 ? "#22c55e" : score >= 3 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div>
                <span className="text-[10px] font-semibold text-success uppercase">✅ Kept</span>
                <ul className="text-[10px] text-text-muted mt-1 space-y-0.5 list-disc list-inside">
                  {level.highlights.kept.slice(0, 4).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              {level.highlights.lost.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-red-400 uppercase">❌ Dropped/Lost</span>
                  <ul className="text-[10px] text-text-muted mt-1 space-y-0.5 list-disc list-inside">
                    {level.highlights.lost.slice(0, 4).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {level.highlights.risk && (
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-[10px] text-red-700 dark:text-red-300">
                  {level.highlights.risk}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Comparison table */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-4">Code Quality Comparison</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-2 pr-4 font-medium">Dimension</th>
                {data.levels.map((l) => (
                  <th key={l.id} className="text-center py-2 px-3 font-medium">{l.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-text">
              {data.dimensions.map((dim) => (
                <tr key={dim.key} className="border-b border-border/30">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Icon name={dim.icon} size={14} className="text-text-muted" />
                      <span className="font-medium">{dim.label}</span>
                    </div>
                  </td>
                  {data.levels.map((l) => {
                    const score = l.scores[dim.key] || 0;
                    return (
                      <td key={l.id} className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div
                                key={n}
                                className={`w-2 h-2 rounded-full ${
                                  n <= score
                                    ? score >= 4 ? "bg-green-500" : score >= 3 ? "bg-amber-500" : "bg-red-500"
                                    : "bg-surface-3"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-[10px] w-3">{score}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Concrete example */}
      <div>
        <button
          type="button"
          onClick={() => setShowExample(!showExample)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Icon name={showExample ? "expand_less" : "expand_more"} size={14} />
          {data.concreteExample.title}
        </button>
        {showExample && (
          <div className="mt-3 space-y-6">
            {data.concreteExample.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h5 className="text-sm font-semibold text-text">{section.label}</h5>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="p-3 rounded border border-border bg-surface-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">OFF (Baseline) — complete</span>
                    <pre className="mt-1 text-[10px] font-mono text-text leading-relaxed whitespace-pre-wrap overflow-auto max-h-[300px]">{section.off}</pre>
                  </div>
                  <div className="p-3 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase">Ponytail Full — minimal</span>
                    <pre className="mt-1 text-[10px] font-mono text-text leading-relaxed whitespace-pre-wrap overflow-auto max-h-[300px]">{section.full}</pre>
                  </div>
                  <div className="p-3 rounded border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20">
                    <span className="text-[10px] font-semibold text-purple-500 uppercase">Ponytail Ultra — extreme</span>
                    <pre className="mt-1 text-[10px] font-mono text-text leading-relaxed whitespace-pre-wrap overflow-auto max-h-[300px]">{section.ultra}</pre>
                  </div>
                </div>
                <p className="text-xs text-text-muted italic bg-surface-1 p-2 rounded">
                  💡 {section.annotation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Guardrails Section ---
function GuardrailsSection() {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: "#ef4444", backgroundColor: "#ef444410" }}
      >
        <h3 className="font-semibold text-text mb-1">🛡️ Guardrails — What is NEVER stripped away</h3>
        <p className="text-sm text-text-muted">
          ITXBridge injects hard rules into the system prompt to ensure critical content is never affected by Caveman/Ponytail.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Caveman Guardrails */}
        <Card>
          <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="auto_awesome" size={18} className="text-amber-500" />
            {GUARDRAILS.caveman.title}
          </h4>
          <p className="text-[10px] text-text-muted mb-3 font-mono">
            Source: {GUARDRAILS.caveman.source}
          </p>
          <div className="space-y-2">
            {GUARDRAILS.caveman.rules.map((rule, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:bg-surface-1 transition-colors"
              >
                <Icon name={rule.icon} size={18} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-text">{rule.what}</div>
                  <div className="text-[10px] text-text-muted">{rule.action}</div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                    rule.color === "#22c55e"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : rule.color === "#ef4444"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {rule.color === "#22c55e" ? "PROTECTED" : rule.color === "#ef4444" ? "CRITICAL" : "REMOVED"}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Ponytail Guardrails */}
        <Card>
          <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Icon name="psychology" size={18} className="text-emerald-500" />
            {GUARDRAILS.ponytail.title}
          </h4>
          <p className="text-[10px] text-text-muted mb-3 font-mono">
            Source: {GUARDRAILS.ponytail.source}
          </p>
          <div className="space-y-2">
            {GUARDRAILS.ponytail.rules.map((rule, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:bg-surface-1 transition-colors"
              >
                <Icon name={rule.icon} size={18} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-text">{rule.what}</div>
                  <div className="text-[10px] text-text-muted">{rule.action}</div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                    rule.color === "#ef4444"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {rule.color === "#ef4444" ? "CRITICAL" : "REMOVED"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <h4 className="text-sm font-semibold text-text mb-3">🔧 How It Works</h4>
        <div className="text-xs text-text-muted space-y-2">
          <p>
            Guardrails are <strong>injected directly into the system prompt</strong> of the LLM request body,
            right before sending to the provider. The LLM follows these rules as part of the system instructions.
          </p>
          <div className="p-3 rounded bg-surface-2 font-mono text-[11px] leading-relaxed">
            <span className="text-text-muted">// Example: Caveman Full system prompt contains:</span><br />
            <span className="text-amber-500">"Code blocks, file paths, commands, errors, URLs: keep exact.</span><br />
            <span className="text-red-400">Security warnings, irreversible action confirmations, multi-step ordered sequences: write normal.</span><br />
            <span className="text-amber-500">Resume terse style after."</span>
          </div>
          <p>
            This means: even with <strong>Caveman Ultra</strong> enabled, if the LLM detects a security vulnerability,
            it will automatically switch to normal writing to ensure critical information is not missed.
          </p>
        </div>
      </Card>
    </div>
  );
}

// --- Recommendations Section ---
function RecommendationsSection() {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-4 border-l-4"
        style={{ borderLeftColor: "#3b82f6", backgroundColor: "#3b82f610" }}
      >
        <h3 className="font-semibold text-text mb-1">💡 Usage Recommendations by Use Case</h3>
        <p className="text-sm text-text-muted">
          There is no "best" configuration for every situation. Choose the level appropriate for your context.
        </p>
      </div>

      <div className="space-y-3">
        {RECOMMENDATIONS.map((rec, idx) => (
          <div
            key={idx}
            className="rounded-lg border overflow-hidden"
            style={{
              borderLeftWidth: "4px",
              borderLeftColor: rec.riskLevel === "high" ? "#ef4444" : rec.riskLevel === "medium" ? "#f59e0b" : "#22c55e",
            }}
          >
            <div className="flex items-center gap-4 p-4">
              {/* Icon */}
              <Icon name={rec.icon} size={24} className="text-text-muted shrink-0" />

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-text">{rec.useCase}</h4>
                <p className="text-xs text-text-muted mt-0.5">{rec.reason}</p>
              </div>

              {/* Settings */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <div className="text-[10px] text-text-muted uppercase">Caveman</div>
                  <div
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      rec.caveman === "OFF"
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        : rec.caveman === "Lite"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                          : rec.caveman === "Full"
                            ? "bg-amber-200 dark:bg-amber-900/50 text-amber-700"
                            : "bg-red-100 dark:bg-red-900/30 text-red-500"
                    }`}
                  >
                    {rec.caveman}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-text-muted uppercase">Ponytail</div>
                  <div
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      rec.ponytail === "OFF"
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        : rec.ponytail === "Lite"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                          : rec.ponytail === "Full"
                            ? "bg-emerald-200 dark:bg-emerald-900/50 text-emerald-700"
                            : "bg-purple-100 dark:bg-purple-900/30 text-purple-500"
                    }`}
                  >
                    {rec.ponytail}
                  </div>
                </div>
              </div>

              {/* Risk badge */}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                  rec.riskLevel === "high"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                    : rec.riskLevel === "medium"
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                      : "bg-green-100 dark:bg-green-900/30 text-green-600"
                }`}
              >
                {rec.riskLevel === "high" ? "⚠️ HIGH RISK" : rec.riskLevel === "medium" ? "⚡ MEDIUM" : "✅ LOW RISK"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 rounded-lg bg-surface-1 border border-border">
        <h4 className="text-sm font-semibold text-text mb-2">General Principles</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-2xl">🟢</span>
            <div>
              <p className="font-medium text-text">Low Risk</p>
              <p className="text-text-muted">Code review, debug, log analysis — enable Caveman Full/Ultra, Ponytail based on code needs</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">🟡</span>
            <div>
              <p className="font-medium text-text">Medium Risk</p>
              <p className="text-text-muted">Internal tools, prototypes — enable Full, test output thoroughly before using</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">🔴</span>
            <div>
              <p className="font-medium text-text">High Risk</p>
              <p className="text-text-muted">Production, security, docs — OFF or Lite only for safety</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Simulation Client
// ============================================================================
export default function SimulationClient() {
  const tabs = [
    { id: "rtk", label: "RTK", icon: "bolt", component: RtkTab },
    { id: "headroom", label: "Headroom", icon: "compress", component: HeadroomTab },
    { id: "caveman", label: "Caveman", icon: "auto_awesome", component: CavemanTab },
    { id: "ponytail", label: "Ponytail", icon: "psychology", component: PonytailTab },
    { id: "combined", label: "Combined", icon: "layers", component: CombinedTab },
    { id: "quality", label: "Quality Impact", icon: "assessment", component: QualityImpactTab },
  ];

  const [activeTab, setActiveTab] = useState("combined");

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component || CombinedTab;
  const featureColors = {
    rtk: COLORS.blue,
    headroom: COLORS.purple,
    caveman: COLORS.amber,
    ponytail: COLORS.emerald,
    combined: COLORS.red,
    quality: "#f97316",
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Icon name="science" size={18} className="text-primary" />
            Token Saver Simulation
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Realistic simulation of ITXBridge's 4 token-saving features with input/output data and before/after token counts
          </p>
        </div>
        <Link
          href="/dashboard/token-saver"
          className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
        >
          <Icon name="arrow_back" size={18} className="text-sm" />
          Back to Token Saver
        </Link>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 p-1 bg-surface-1 rounded-lg border border-border overflow-x-auto">
        {tabs.map((tab) => {
          const color = featureColors[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "text-white shadow-sm"
                  : "text-text-muted hover:text-text hover:bg-surface-2"
              }`}
              style={isActive ? { backgroundColor: color } : {}}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <ActiveComponent />

      {/* Footer note */}
      <div className="text-center text-xs text-text-muted py-4 border-t border-border">
        <p>
          📊 Simulation data is based on real test cases from{" "}
          <code className="text-primary">TOKEN_SAVER_TESTCASE.md</code>.
          Token counts are estimated at ~4 chars/token (English text).
          Actual results may vary by model and provider.
        </p>
      </div>
    </div>
  );
}
