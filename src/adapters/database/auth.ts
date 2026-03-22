/**
 * Ring 4: Auth Adapter
 * 
 * Extracts authenticated user from request.
 * Used by all API routes that need auth.
 * 
 * Replaces: The complete LACK of auth in analyze and chat routes.
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Get the authenticated user from a request.
 * Returns null if not authenticated (doesn't throw).
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Require authenticated user — throws if not authenticated.
 * Use in API routes that must have a user.
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) {
    throw new AuthError('Authentication required');
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Server-side Supabase client with service role (for admin operations only).
 * NEVER expose this client-side.
 */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase service credentials not configured');
  }
  
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
