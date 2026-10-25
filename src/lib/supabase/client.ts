import { createBrowserClient } from '@supabase/ssr';

import { AUTH_COOKIE_OPTIONS } from '@/lib/supabase/cookie-options';
import type { Database } from '@/lib/types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: AUTH_COOKIE_OPTIONS },
  );

  return client;
}
