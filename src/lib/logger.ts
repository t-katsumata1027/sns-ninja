/**
 * Structured Logging Utility
 * In production, logs should be JSON-formatted for better observability.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, message: string, context: Record<string, any> = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const output = JSON.stringify(logEntry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (msg: string, ctx?: Record<string, any>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, any>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, any>) => log("error", msg, ctx),
  debug: (msg: string, ctx?: Record<string, any>) => log("debug", msg, ctx),
};
