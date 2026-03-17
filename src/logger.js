// ─────────────────────────────────────────────────────────────
// logger.js — Append route decisions to a JSON Lines file
// ─────────────────────────────────────────────────────────────
import { appendFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';

const LOG_FILE = join(process.cwd(), 'route_log.jsonl');

async function ensureLogFilePath() {
  try {
    const current = await stat(LOG_FILE);
    if (current.isDirectory()) {
      const backupDir = `${LOG_FILE}.backup-${Date.now()}`;
      await rename(LOG_FILE, backupDir);
    }
  } catch (error) {
    // ENOENT means the log file does not exist yet, which is expected.
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

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
    await ensureLogFilePath();
    await appendFile(LOG_FILE, JSON.stringify(record) + '\n', 'utf-8');
  } catch (error) {
    console.error('[logger] Failed to write log entry:', error.message);
  }
}
