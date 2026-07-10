import { statsEmitter, getActiveRequestsFast } from "@/lib/usageDb";

export const dynamic = "force-dynamic";

/**
 * SSE stream for real-time usage updates.
 * Uses ONLY in-memory data (getActiveRequestsFast) — NEVER touches the DB.
 * This prevents the SSE path from being blocked by saveRequestUsage() DB writes.
 *
 * Full stats (byModel, byAccount, ...) come from the REST endpoint /api/usage/stats.
 */
export async function GET() {
  const encoder = new TextEncoder();
  const state = { closed: false, keepalive: null, onUpdate: null, onPending: null };

  const stream = new ReadableStream({
    start(controller) {
      function push() {
        if (state.closed) return;
        try {
          const payload = getActiveRequestsFast();
          payload.pending = global._pendingRequests || { byModel: {}, byAccount: {}, bySession: {} };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (err) {
          console.error("[SSE] push error:", err);
          state.closed = true;
          statsEmitter.off("update", state.onUpdate);
          statsEmitter.off("pending", state.onPending);
          clearInterval(state.keepalive);
        }
      }

      state.onUpdate = push;
      state.onPending = push;

      // Send initial payload (pure in-memory, no DB)
      push();

      statsEmitter.on("update", state.onUpdate);
      statsEmitter.on("pending", state.onPending);

      state.keepalive = setInterval(() => {
        if (state.closed) { clearInterval(state.keepalive); return; }
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch {
          state.closed = true;
          clearInterval(state.keepalive);
        }
      }, 25000);
    },

    cancel() {
      state.closed = true;
      statsEmitter.off("update", state.onUpdate);
      statsEmitter.off("pending", state.onPending);
      clearInterval(state.keepalive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
