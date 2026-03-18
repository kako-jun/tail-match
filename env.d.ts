interface CloudflareEnv {
  DB: D1Database;
}

declare module '@cloudflare/next-on-pages' {
  export function getRequestContext(): {
    env: CloudflareEnv;
    ctx: ExecutionContext;
    cf: IncomingRequestCfProperties;
  };
  export function setupDevPlatform(): Promise<void>;
}
