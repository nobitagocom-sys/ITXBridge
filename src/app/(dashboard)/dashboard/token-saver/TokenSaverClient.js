"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icon,  Card, Button, Input, Modal, Toggle } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { getCurrentLocale, onLocaleChange } from "@/i18n/runtime";
import {
  WENYAN_LOCALES,
  CAVEMAN_LEVELS,
  PONYTAIL_LEVELS,
} from "../endpoint/endpointConstants";

export default function TokenSaverClient() {
  const [rtkEnabled, setRtkEnabledState] = useState(true);
  const [headroomEnabled, setHeadroomEnabled] = useState(false);
  const [headroomUrl, setHeadroomUrl] = useState("http://localhost:8787");
  const [headroomStatus, setHeadroomStatus] = useState({
    installed: false,
    running: false,
    python: null,
    loading: true,
  });
  const [showHeadroomInstallModal, setShowHeadroomInstallModal] =
    useState(false);
  const [headroomActionLoading, setHeadroomActionLoading] = useState(false);
  const [headroomActionError, setHeadroomActionError] = useState("");
  const [cavemanEnabled, setCavemanEnabled] = useState(false);
  const [cavemanLevel, setCavemanLevel] = useState("full");
  const [ponytailEnabled, setPonytailEnabled] = useState(false);
  const [ponytailLevel, setPonytailLevel] = useState("full");
  const [locale, setLocale] = useState("en");

  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    setLocale(getCurrentLocale());
    return onLocaleChange(() => setLocale(getCurrentLocale()));
  }, []);

  const isWenyanLocale = WENYAN_LOCALES.includes(locale);
  const visibleCavemanLevels = isWenyanLocale
    ? CAVEMAN_LEVELS
    : CAVEMAN_LEVELS.filter((lvl) => !lvl.wenyan);

  useEffect(() => {
    const current = CAVEMAN_LEVELS.find((lvl) => lvl.id === cavemanLevel);
    if (current?.wenyan && !isWenyanLocale) {
      setCavemanLevel("ultra");
      patchSetting({ cavemanLevel: "ultra" });
    }
  }, [isWenyanLocale, cavemanLevel]);

  const patchSetting = async (patch) => {
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch (error) {
      console.log("Error updating setting:", error);
    }
  };

  const handleRtkEnabled = async (value) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtkEnabled: value }),
      });
      if (res.ok) setRtkEnabledState(value);
    } catch (error) {
      console.log("Error updating rtkEnabled:", error);
    }
  };

  const handleCavemanEnabled = (value) => {
    setCavemanEnabled(value);
    patchSetting({ cavemanEnabled: value });
  };

  const handleHeadroomEnabled = (value) => {
    const nextUrl = headroomUrl.trim() || "http://localhost:8787";
    setHeadroomUrl(nextUrl);
    setHeadroomEnabled(value);
    patchSetting({ headroomEnabled: value, headroomUrl: nextUrl });
  };

  const handleHeadroomUrlBlur = async () => {
    const next = headroomUrl.trim() || "http://localhost:8787";
    setHeadroomUrl(next);
    await patchSetting({ headroomUrl: next });
    refreshHeadroomStatus();
  };

  const refreshHeadroomStatus = useCallback(async () => {
    setHeadroomStatus((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch("/api/headroom/status", {
        headers: { "Cache-Control": "no-store" },
      });
      const data = await res.json();
      setHeadroomStatus({ ...data, loading: false });
    } catch {
      setHeadroomStatus({
        installed: false,
        running: false,
        python: null,
        loading: false,
      });
    }
  }, []);

  const handleHeadroomStart = useCallback(async () => {
    setHeadroomActionError("");
    setHeadroomActionLoading(true);
    try {
      const res = await fetch("/api/headroom/start", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to start proxy");
      await refreshHeadroomStatus();
    } catch (e) {
      setHeadroomActionError(e.message);
    } finally {
      setHeadroomActionLoading(false);
    }
  }, [refreshHeadroomStatus]);

  const handleHeadroomStop = useCallback(async () => {
    setHeadroomActionLoading(true);
    try {
      await fetch("/api/headroom/stop", { method: "POST" });
      await refreshHeadroomStatus();
    } finally {
      setHeadroomActionLoading(false);
    }
  }, [refreshHeadroomStatus]);

  const handleCavemanLevel = (level) => {
    setCavemanLevel(level);
    patchSetting({ cavemanLevel: level });
  };

  const handlePonytailEnabled = (value) => {
    setPonytailEnabled(value);
    patchSetting({ ponytailEnabled: value });
  };

  const handlePonytailLevel = (level) => {
    setPonytailLevel(level);
    patchSetting({ ponytailLevel: level });
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setRtkEnabledState(data.rtkEnabled !== false);
          setHeadroomEnabled(!!data.headroomEnabled);
          setHeadroomUrl(data.headroomUrl || "http://localhost:8787");
          setCavemanEnabled(!!data.cavemanEnabled);
          setCavemanLevel(data.cavemanLevel || "full");
          setPonytailEnabled(!!data.ponytailEnabled);
          setPonytailLevel(data.ponytailLevel || "full");
          refreshHeadroomStatus();
        }
      } catch {}
    };
    loadSettings();
  }, [refreshHeadroomStatus]);

  const headroomRunning = !!headroomStatus.running;
  const headroomStatusLabel = headroomStatus.loading
    ? "Checking…"
    : headroomRunning
      ? "Running"
      : headroomStatus.localUrl !== false && !headroomStatus.installed
        ? "Not installed"
        : headroomStatus.localUrl !== false
          ? "Stopped"
          : "External";
  const headroomLocalUrl = headroomStatus.localUrl !== false;
  const headroomCanStart = !!headroomStatus.canStart;
  const headroomManaged =
    headroomLocalUrl && !!headroomStatus.managedPid;

  return (
    <div className="space-y-6 p-6">
      {/* Simulation Banner */}
      <Link
        href="/dashboard/token-saver/simulation"
        className="block rounded-lg p-4 border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Icon name="science" size={18} className="text-2xl text-primary" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text group-hover:text-primary transition-colors">
              🧪 Token Saver Simulation — See Live Demo
            </h3>
            <p className="text-sm text-text-muted mt-0.5">
              Simulates 4 features with full input/output data and token counts before/after ITXBridge. See live results of RTK, Headroom, Caveman, Ponytail, and Combined pipeline.
            </p>
          </div>
          <Icon name="arrow_forward" size={18} className="text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* === RTK Card === */}
        <Card padding="sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-[6px] bg-primary/10 text-primary shrink-0">
                <Icon name="bolt" size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">Compress Tool Output (RTK)</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  git/grep/ls/tree/logs → 60-90% fewer input tokens
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Toggle
                checked={rtkEnabled}
                onChange={() => handleRtkEnabled(!rtkEnabled)}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
            <p className="text-sm text-text-muted">
              RTK compresses common command outputs (git diff, grep results, file listings, build logs)
              before they reach the model, dramatically reducing input token usage.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-medium">60-90% savings</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">Automatic</span>
              <span className="px-2 py-0.5 rounded bg-surface-2 text-text-muted font-medium">Zero config</span>
            </div>
            <a
              href="https://github.com/rtk-ai/rtk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Learn more <Icon name="open_in_new" size={14} />
            </a>
          </div>
        </Card>

        {/* === Headroom Card === */}
        <Card padding="sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-[6px] bg-primary/10 text-primary shrink-0">
                <Icon name="compress" size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">Compress Context (Headroom)</h3>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      headroomRunning
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {headroomStatusLabel}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Compress prompts via /v1/compress before routing to the model
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Toggle
                checked={headroomEnabled && headroomRunning}
                disabled={!headroomRunning}
                onChange={() => handleHeadroomEnabled(!headroomEnabled)}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
            <p className="text-sm text-text-muted">
              Headroom intelligently compresses conversation context before sending to the model,
              preserving important information while reducing token usage.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-[6px] bg-bg border border-border-subtle">
              <span className="text-xs font-medium text-text-muted shrink-0">Proxy URL</span>
              <input
                value={headroomUrl}
                onChange={(e) => setHeadroomUrl(e.target.value)}
                onBlur={handleHeadroomUrlBlur}
                placeholder="http://localhost:8787"
                className="flex-1 min-w-0 bg-transparent text-xs font-mono text-text-main outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {headroomManaged ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleHeadroomStop}
                  disabled={headroomActionLoading}
                >
                  {headroomActionLoading ? "Stopping…" : "Stop Headroom"}
                </Button>
              ) : headroomCanStart ? (
                <Button
                  size="sm"
                  onClick={handleHeadroomStart}
                  disabled={headroomActionLoading}
                >
                  {headroomActionLoading ? "Starting…" : "Start Headroom"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowHeadroomInstallModal(true)}
                >
                  Setup Headroom
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={refreshHeadroomStatus}
              >
                Recheck
              </Button>
            </div>
            <a
              href="https://github.com/chopratejas/headroom"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Learn more <Icon name="open_in_new" size={14} />
            </a>
          </div>
        </Card>

        {/* === Caveman Card === */}
        <Card padding="sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-[6px] bg-primary/10 text-primary shrink-0">
                <Icon name="font_download" size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">Compress LLM Output (Caveman)</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Terse-style system prompt → ~65% fewer output tokens (up to 87%)
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Toggle
                checked={cavemanEnabled}
                onChange={() => handleCavemanEnabled(!cavemanEnabled)}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
            <p className="text-sm text-text-muted">
              Caveman adds a terse-style system prompt that biases the model toward minimal,
              compact responses — saving significant output tokens.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleCavemanLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => handleCavemanLevel(lvl.id)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-colors ${
                    cavemanLevel === lvl.id
                      ? "bg-primary text-white border-primary"
                      : "bg-transparent border-border text-text-muted hover:bg-surface-2"
                  }`}
                  title={lvl.desc}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-primary">
              {CAVEMAN_LEVELS.find((lvl) => lvl.id === cavemanLevel)?.desc}
            </p>
            <a
              href="https://github.com/JuliusBrussee/caveman"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Learn more <Icon name="open_in_new" size={14} />
            </a>
          </div>
        </Card>

        {/* === Ponytail Card === */}
        <Card padding="sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-[6px] bg-primary/10 text-primary shrink-0">
                <Icon name="auto_awesome" size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">Lazy Senior Dev (Ponytail)</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Bias the model toward minimal code: YAGNI, reuse stdlib, deletion over addition
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Toggle
                checked={ponytailEnabled}
                onChange={() => handlePonytailEnabled(!ponytailEnabled)}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
            <p className="text-sm text-text-muted">
              Ponytail biases model responses toward minimal, efficient code by applying
              YAGNI principles, stdlib reuse, and favoring deletion over unnecessary addition.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {PONYTAIL_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => handlePonytailLevel(lvl.id)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-colors ${
                    ponytailLevel === lvl.id
                      ? "bg-primary text-white border-primary"
                      : "bg-transparent border-border text-text-muted hover:bg-surface-2"
                  }`}
                  title={lvl.desc}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-primary">
              {PONYTAIL_LEVELS.find((lvl) => lvl.id === ponytailLevel)?.desc}
            </p>
            <a
              href="https://github.com/DietrichGebert/ponytail"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Learn more <Icon name="open_in_new" size={14} />
            </a>
          </div>
        </Card>
      </div>

      {/* Headroom Modal */}
      <Modal
        isOpen={showHeadroomInstallModal}
        title={headroomRunning ? "Headroom" : "Setup Headroom"}
        onClose={() => setShowHeadroomInstallModal(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span>Status</span>
            <span
              className={headroomRunning ? "text-success" : "text-warning"}
            >
              {headroomStatusLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Proxy URL</p>
            <Input
              value={headroomUrl}
              onChange={(e) => setHeadroomUrl(e.target.value)}
              onBlur={handleHeadroomUrlBlur}
              placeholder="http://localhost:8787"
              className="font-mono text-sm"
            />
            <p className="text-xs text-text-muted">
              Use a local proxy for Start/Stop, or an external Docker sidecar
              like http://headroom:8787.
            </p>
          </div>
          {headroomManaged ? (
            <Button
              onClick={handleHeadroomStop}
              variant="ghost"
              fullWidth
              disabled={headroomActionLoading}
            >
              {headroomActionLoading ? "Stopping…" : "Stop Headroom"}
            </Button>
          ) : headroomRunning ? (
            <p className="text-sm text-success">
              Headroom proxy is reachable. You can enable the token saver.
            </p>
          ) : headroomCanStart ? (
            <Button
              onClick={handleHeadroomStart}
              fullWidth
              disabled={headroomActionLoading}
            >
              {headroomActionLoading ? "Starting…" : "Start Headroom"}
            </Button>
          ) : !headroomLocalUrl ? (
            <p className="text-sm text-warning">
              Start Headroom separately at the configured URL, then recheck.
            </p>
          ) : !headroomStatus.python ? (
            <p className="text-sm text-warning">
              Python ≥ 3.10 required for local managed mode. Install Python
              first, or use an external proxy URL.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Install then click Start:</p>
              <div className="flex items-center gap-2">
                <pre className="flex-1 rounded bg-black/5 dark:bg-white/5 p-2 text-xs font-mono overflow-x-auto">
                  {`pip install "headroom-ai[proxy]"`}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    copy(`pip install "headroom-ai[proxy]"`)
                  }
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
          {headroomActionError && (
            <p className="text-sm text-warning">{headroomActionError}</p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => refreshHeadroomStatus()}
              variant="ghost"
              fullWidth
            >
              Recheck
            </Button>
            <Button
              onClick={() => setShowHeadroomInstallModal(false)}
              fullWidth
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
