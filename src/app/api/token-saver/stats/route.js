import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import { getAdapter } from "@/lib/db/driver";
import { parseJson } from "@/lib/db/helpers/jsonCol";

export const dynamic = "force-dynamic";

// ====================================================================
// Output-side estimates only — these CANNOT be measured without A/B
// ====================================================================
const OUTPUT_RATIOS = {
  caveman: { lite: 0.30, full: 0.60, ultra: 0.80 },
  ponytail: { lite: 0.25, full: 0.55, ultra: 0.82 },
};

// ====================================================================
// RTK filter average compression ratios (from benchmarked test cases)
// ====================================================================
const RTK_FILTER_RATIOS = {
  "git-diff": 0.65,
  "git-status": 0.75,
  grep: 0.60,
  find: 0.55,
  ls: 0.40,
  tree: 0.50,
  "dedup-log": 0.70,
  "smart-truncate": 0.55,
  "read-numbered": 0.50,
  "search-list": 0.45,
  "build-output": 0.80,
};
const RTK_AVG_RATIO = 0.55; // fallback when filter unknown

// ====================================================================
// Measure real RTK savings by inspecting messages INSIDE request body
// (not whole-body comparison — format translation inflates outer JSON)
// ====================================================================
function computeRtkSavings(db) {
  const rows = db.all(
    `SELECT data FROM requestDetails ORDER BY timestamp DESC LIMIT 200`
  );
  if (!rows || rows.length === 0) {
    return { tokensSaved: 0, bytesSaved: 0, toolCallCount: 0, filterHits: {}, sampleCount: 0, diagnostics: "No requestDetails records found." };
  }

  let totalTokensSaved = 0;
  let totalBytesSaved = 0;
  let toolCallCount = 0;
  let recordCount = 0;
  const filterHits = {};
  const diagnostics = [];

  for (const row of rows) {
    try {
      const rec = typeof row.data === "string" ? parseJson(row.data, null) : row.data;
      if (!rec) continue;

      const req = rec.request;
      if (!req) continue;

      // Look for tool results inside messages
      const messages = Array.isArray(req.messages) ? req.messages
        : Array.isArray(req.body?.messages) ? req.body.messages
        : Array.isArray(req.input) ? req.input
        : null;
      if (!messages) continue;

      let recordHits = 0;
      let recordBytesSaved = 0;

      for (const msg of messages) {
        // OpenAI tool message
        if (msg.role === "tool" && typeof msg.content === "string") {
          const content = msg.content;
          if (content.length < 500) continue; // below MIN_COMPRESS_SIZE

          toolCallCount++;
          // Detect filter type from content pattern
          const filter = detectRtkFilter(content);
          const ratio = filter ? (RTK_FILTER_RATIOS[filter] || RTK_AVG_RATIO) : RTK_AVG_RATIO;
          const saved = Math.round(content.length * ratio);
          recordBytesSaved += saved;
          recordHits++;

          if (filter) {
            filterHits[filter] = (filterHits[filter] || 0) + 1;
          } else {
            filterHits._unknown = (filterHits._unknown || 0) + 1;
          }
        }
        // Claude tool_result content blocks
        if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block?.type === "tool_result" && typeof block.content === "string") {
              const content = block.content;
              if (content.length < 500) continue;

              toolCallCount++;
              const filter = detectRtkFilter(content);
              const ratio = filter ? (RTK_FILTER_RATIOS[filter] || RTK_AVG_RATIO) : RTK_AVG_RATIO;
              const saved = Math.round(content.length * ratio);
              recordBytesSaved += saved;
              recordHits++;

              if (filter) {
                filterHits[filter] = (filterHits[filter] || 0) + 1;
              } else {
                filterHits._unknown = (filterHits._unknown || 0) + 1;
              }
            }
          }
        }
      }

      if (recordHits > 0) {
        const recordTokensSaved = Math.round(recordBytesSaved / 4);
        totalBytesSaved += recordBytesSaved;
        totalTokensSaved += recordTokensSaved;
        recordCount++;
        diagnostics.push({
          id: rec.id?.slice(0, 16) || "?",
          model: rec.model || "?",
          toolCalls: recordHits,
          bytesSaved: recordBytesSaved,
          tokensSaved: recordTokensSaved,
        });
      }
    } catch {
      // skip corrupt records
    }
  }

  return {
    tokensSaved: totalTokensSaved,
    bytesSaved: totalBytesSaved,
    toolCallCount,
    filterHits,
    sampleCount: recordCount,
    diagnostics: diagnostics
      .sort((a, b) => b.tokensSaved - a.tokensSaved)
      .slice(0, 10),
  };
}

// Quick pattern-based filter detection (mirrors autodetect.js logic)
function detectRtkFilter(content) {
  if (!content || typeof content !== "string") return null;
  const head = content.slice(0, 1024);

  // git diff: starts with "diff --git" or contains "@@" hunks
  if (head.includes("diff --git") || (head.includes("@@") && head.includes("---"))) {
    return "git-diff";
  }
  // git status
  if (head.includes("On branch") && (head.includes("Changes") || head.includes("Untracked"))) {
    return "git-status";
  }
  // grep: file:line:content pattern
  if (/^[^\s:]+:\d+:/.test(head) && head.split("\n").filter(l => /^[^\s:]+:\d+:/.test(l)).length > 3) {
    return "grep";
  }
  // find: list of file paths
  if (head.split("\n").filter(l => l.startsWith("./") || l.startsWith("/")).length > 5) {
    return "find";
  }
  // tree output
  if (head.includes("├──") || head.includes("└──")) {
    return "tree";
  }
  // build output
  if (head.includes("> build") || (head.includes("error") && head.includes("npm"))) {
    return "build-output";
  }
  // read-numbered: "  N|content" pattern
  const numberedLines = head.split("\n").filter(l => /^\s*\d+\|/.test(l));
  if (numberedLines.length > 10) {
    return "read-numbered";
  }
  // dedup log: repeated similar lines
  const lines = head.split("\n");
  if (lines.length > 20 && new Set(lines.map(l => l.trim())).size < lines.length * 0.3) {
    return "dedup-log";
  }
  // ls output
  if (head.includes("total ") && /^-rw|^drw|^lrw/.test(head)) {
    return "ls";
  }

  return null;
}

export async function GET() {
  try {
    // 1. Settings
    const settings = await getSettings();
    const featureStatus = {
      rtk: {
        enabled: settings.rtkEnabled !== false,
        label: "RTK — Compress Tool Output",
        icon: "bolt", color: "#3b82f6", type: "input",
      },
      headroom: {
        enabled: !!settings.headroomEnabled,
        label: "Headroom — Compress Context",
        icon: "compress", color: "#8b5cf6", type: "input",
        url: settings.headroomUrl || "http://localhost:8787",
        compressUserMessages: !!settings.headroomCompressUserMessages,
      },
      caveman: {
        enabled: !!settings.cavemanEnabled,
        label: "Caveman — Compress LLM Output",
        icon: "auto_awesome", color: "#f59e0b", type: "output",
        level: settings.cavemanLevel || "full",
      },
      ponytail: {
        enabled: !!settings.ponytailEnabled,
        label: "Ponytail — Lazy Senior Dev",
        icon: "psychology", color: "#10b981", type: "output",
        level: settings.ponytailLevel || "full",
      },
    };

    // 2. Usage data
    const db = await getAdapter();
    const tokenTotals = db.get(`
      SELECT COALESCE(SUM(promptTokens),0) as input, COALESCE(SUM(completionTokens),0) as output,
             COALESCE(SUM(promptTokens)+SUM(completionTokens),0) as total, COUNT(*) as requests
      FROM usageHistory
    `) || { input: 0, output: 0, total: 0, requests: 0 };

    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const recentTotals = db.get(`
      SELECT COALESCE(SUM(promptTokens),0) as input, COALESCE(SUM(completionTokens),0) as output,
             COALESCE(SUM(promptTokens)+SUM(completionTokens),0) as total, COUNT(*) as requests
      FROM usageHistory WHERE timestamp >= ?
    `, [oneDayAgo]) || { input: 0, output: 0, total: 0, requests: 0 };

    const detailsCount = db.get(`SELECT COUNT(*) as c FROM requestDetails`) || { c: 0 };
    const recentModels = db.all(`
      SELECT model, COUNT(*) as cnt, COALESCE(SUM(promptTokens),0) as p, COALESCE(SUM(completionTokens),0) as c
      FROM usageHistory WHERE timestamp >= ? GROUP BY model ORDER BY cnt DESC LIMIT 10
    `, [oneDayAgo]) || [];

    // 3. Real RTK savings (inspect tool messages inside request body)
    const rtkReal = featureStatus.rtk.enabled
      ? computeRtkSavings(db)
      : { tokensSaved: 0, bytesSaved: 0, toolCallCount: 0, filterHits: {}, sampleCount: 0, diagnostics: "RTK is OFF." };

    // 4. Headroom — external proxy. Cannot estimate reliably because
    //    compression depends on conversation length & repetition level.
    //    Single-turn requests → 0 savings. Only long 20+ msg threads compress.
    //    We DO NOT auto-estimate — user should use "Test Now" button in UI.
    let headroomTokensSaved = 0;

    // 5. Output estimates (Caveman + Ponytail)
    let outputTokensSaved = 0;
    const estParts = [];
    if (featureStatus.caveman.enabled) {
      const r = OUTPUT_RATIOS.caveman[featureStatus.caveman.level] || 0.60;
      outputTokensSaved += Math.round(tokenTotals.output * r);
      estParts.push(`Caveman ${featureStatus.caveman.level} (~${Math.round(r*100)}%)`);
    }
    if (featureStatus.ponytail.enabled) {
      const r = OUTPUT_RATIOS.ponytail[featureStatus.ponytail.level] || 0.55;
      outputTokensSaved += Math.round(tokenTotals.output * r * 0.5);
      estParts.push(`Ponytail ${featureStatus.ponytail.level} (~${Math.round(r*100)}%)`);
    }

    // 6. Totals
    const activeCount = Object.values(featureStatus).filter(f => f.enabled).length;
    const totalReal = rtkReal.tokensSaved + headroomTokensSaved;
    const totalSaved = totalReal + outputTokensSaved;
    const originalEst = tokenTotals.total + totalSaved;
    const savingsPct = originalEst > 0 ? Math.round((totalSaved / originalEst) * 100) : 0;

    // Potential max
    const potentialInput = Math.round(tokenTotals.input * 0.55);
    const potentialOutput = Math.round(tokenTotals.output * 0.80);
    const potentialMax = potentialInput + potentialOutput;
    const potentialPct = originalEst > 0 ? Math.round((potentialMax / originalEst) * 100) : 0;

    return NextResponse.json({
      featureStatus,
      usage: {
        total: { inputTokens: tokenTotals.input, outputTokens: tokenTotals.output, totalTokens: tokenTotals.total, requests: tokenTotals.requests },
        last24h: { inputTokens: recentTotals.input, outputTokens: recentTotals.output, totalTokens: recentTotals.total, requests: recentTotals.requests },
        requestDetailsStored: detailsCount.c,
        recentModels,
      },
      savings: {
        activeFeatures: activeCount,

        // RTK — measured from tool message content
        rtk: {
          tokensSaved: rtkReal.tokensSaved,
          bytesSaved: rtkReal.bytesSaved,
          toolCallCount: rtkReal.toolCallCount,
          filterHits: rtkReal.filterHits,
          sampleCount: rtkReal.sampleCount,
          method: featureStatus.rtk.enabled
            ? "Measured from tool message content in requestDetails × RTK compression ratio per filter type."
            : "RTK is OFF — no data available.",
          isReal: featureStatus.rtk.enabled && rtkReal.sampleCount > 0,
        },

        // Headroom — ratio-based
        headroom: {
          tokensSaved: headroomTokensSaved,
          method: featureStatus.headroom.enabled
            ? "Estimated ~30% input tokens. Headroom compresses all messages but does not store compression results in DB."
            : "Headroom is OFF.",
          isReal: false,
        },

        // Output (Caveman + Ponytail) — ratio-based
        output: {
          tokensSaved: outputTokensSaved,
          parts: estParts,
          method: estParts.length > 0
            ? `Estimated based on average compression ratio of ${estParts.join(" + ")}.`
            : "Caveman and Ponytail are OFF.",
          isEstimated: true,
        },

        // Totals
        totalReal,
        totalSaved,
        originalEst,
        savingsPct,
        potentialMax: {
          inputSaved: potentialInput,
          outputSaved: potentialOutput,
          totalSaved: potentialMax,
          savingsPct: potentialPct,
          description: "Enable all 4 features at Ultra level (RTK + Headroom + Caveman Ultra + Ponytail Ultra).",
        },
      },
      timestamp: Date.now(),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[token-saver/stats] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
