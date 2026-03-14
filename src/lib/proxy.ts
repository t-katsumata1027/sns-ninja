/**
 * Proxy configuration utility for SNS automation accounts.
 * Supports residential proxy pools (e.g., IPBurger) for anti-ban.
 */

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: "http" | "https" | "socks5";
}

/**
 * Build a proxy URL string from a ProxyConfig object.
 * e.g. http://user:pass@host:port
 */
export function buildProxyUrl(config: ProxyConfig): string {
  const { protocol, host, port, username, password } = config;
  if (username && password) {
    return `${protocol}://${username}:${password}@${host}:${port}`;
  }
  return `${protocol}://${host}:${port}`;
}

/**
 * Parse a raw proxy_config JSON from the database into a typed ProxyConfig.
 * Returns null if the config is missing or invalid.
 */
export function parseProxyConfig(raw: unknown): ProxyConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const config = raw as Record<string, unknown>;
  if (
    typeof config.host !== "string" ||
    typeof config.port !== "number" ||
    (config.protocol !== "http" && config.protocol !== "https" && config.protocol !== "socks5")
  ) {
    return null;
  }
  return {
    host: config.host,
    port: config.port,
    username: typeof config.username === "string" ? config.username : undefined,
    password: typeof config.password === "string" ? config.password : undefined,
    protocol: config.protocol,
  };
}
