// ─────────────────────────────────────────────────────────────
// logger.js — Append route decisions to a JSON Lines file
// ─────────────────────────────────────────────────────────────
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const LOG_FILE = join(process.cwd(), 'route_log.jsonl');

/**
 * Log a routing decision to the JSONL log file.
 *
 * @param {{ intent: string, confidence: number, user_message: string, final_response: string }} entry
 */
export async function logRoute(entry) {
  const record = {
    timestamp: new Date().toISOString(),
    intent: entry.intent,
    confidence: entry.confidence,
    user_message: entry.user_message,
    final_response: entry.final_response,
  };

  try {
    await appendFile(LOG_FILE, JSON.stringify(record) + '\n', 'utf-8');
  } catch (error) {
    console.error('[logger] Failed to write log entry:', error.message);
  }
}
