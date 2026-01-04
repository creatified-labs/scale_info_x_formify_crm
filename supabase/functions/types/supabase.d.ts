// Type definitions for Supabase JS client
declare module "https://esm.sh/@supabase/supabase-js@2" {
  export interface SupabaseClientOptions {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
    };
    global?: {
      headers?: Record<string, string>;
    };
  }

  export interface SupabaseClient {
    auth: {
      getUser(): Promise<{
        data: { user: any | null };
        error: any | null;
      }>;
      admin: {
        createUser(params: {
          email: string;
          email_confirm?: boolean;
          user_metadata?: Record<string, any>;
        }): Promise<{
          data: any;
          error: any | null;
        }>;
        generateLink(params: {
          type: string;
          email: string;
        }): Promise<{
          data: any;
          error: any | null;
        }>;
        listUsers(): Promise<{
          data: { users: any[] };
          error: any | null;
        }>;
      };
    };
    from(table: string): any;
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions
  ): SupabaseClient;
}
