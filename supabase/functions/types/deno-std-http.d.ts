// Type definitions for Deno standard library HTTP server
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export interface ServeInit {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export type Handler = (
    request: Request,
    connInfo?: { remoteAddr: { hostname: string; port: number } }
  ) => Response | Promise<Response>;

  export function serve(handler: Handler, options?: ServeInit): Promise<void>;
}
