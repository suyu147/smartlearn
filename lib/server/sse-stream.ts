/**
 * SSE Stream Helper
 *
 * Creates a ReadableStream that safely handles client disconnections.
 * When the client aborts (reset / navigate away), the learning graph
 * may still try to write events. This helper guards all controller
 * writes so they silently no-op instead of throwing
 * "Invalid state: Controller is already closed".
 */

import type { StreamEvent } from '@/lib/deeptutor/core/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('sse-stream');

/**
 * Create an SSE-emitting ReadableStream that is resilient to client
 * disconnections.
 *
 * @param source - Label for log messages (e.g. "smartlearn")
 * @param sessionId - Session ID for log correlation
 * @param run - Async function that receives a guarded `emit` callback
 *              and can use it to stream events.  Must NOT call
 *              controller.close() — the helper does that automatically.
 */
const HEARTBEAT_INTERVAL_MS = 15_000; // 每15秒发送心跳，防止代理超时断开连接

export function createSSEStream(
  source: string,
  sessionId: string,
  run: (
    emit: (event: StreamEvent) => void,
    /** True once the client has disconnected */
    isClosed: () => boolean,
  ) => Promise<void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let clientDisconnected = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        if (clientDisconnected) return;
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          clientDisconnected = true;
          log.info(`[${source}] Stream controller closed, skipping write for sessionId=${sessionId}`);
        }
      };

      const isClosed = () => clientDisconnected;

      // 心跳定时器：定期发送 SSE 注释以保持连接活跃
      const heartbeatTimer = setInterval(() => {
        if (clientDisconnected) {
          clearInterval(heartbeatTimer);
          return;
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clientDisconnected = true;
          clearInterval(heartbeatTimer);
        }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        await run(emit, isClosed);

        // Normal completion — emit final close if still connected
        if (!clientDisconnected) {
          controller.close();
        }
      } catch (err) {
        if (clientDisconnected) {
          log.info(`[${source}] Stream error after disconnect: sessionId=${sessionId}`, err instanceof Error ? err.message : err);
          return;
        }

        const message = err instanceof Error ? err.message : String(err);
        log.error(`[${source}] Stream error: sessionId=${sessionId}`, err);

        try {
          emit(createErrorEvent(source, sessionId, message));
        } catch {
          clientDisconnected = true;
        }

        try { controller.close(); } catch { /* already closed */ }
      } finally {
        clearInterval(heartbeatTimer);
      }
    },

    cancel() {
      clientDisconnected = true;
      log.info(`[${source}] Client disconnected, stream cancelled: sessionId=${sessionId}`);
    },
  });

  return stream;
}

/** Minimal error StreamEvent */
function createErrorEvent(source: string, sessionId: string, message: string): StreamEvent {
  return {
    type: 'error',
    source,
    stage: '',
    content: message,
    metadata: {},
    sessionId,
    turnId: '',
    seq: 0,
    timestamp: Date.now() / 1000,
  };
}
