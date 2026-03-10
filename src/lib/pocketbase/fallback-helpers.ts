/**
 * PocketBase Fallback Helpers
 * Provides resilient query retry and fallback logic
 */

/**
 * Check if error is PB 400 or 404 (recoverable for fallback)
 */
export function isPocketBase400Or404(error: unknown): boolean {
  const err = error as any
  return err?.status === 400 || err?.status === 404 || 
         err?.message?.includes('400') ||
         err?.message?.includes('404') ||
         err?.message?.includes('fetch failed') ||
         err?.code === 'UND_ERR_SOCKET' ||
         err?.cause?.code === 'UND_ERR_SOCKET'
}

/**
 * Check if error is PB auth/permission error (not recoverable with fallback)
 */
export function isPocketBaseAuthError(error: unknown): boolean {
  const err = error as any
  return err?.status === 401 || err?.status === 403
}

/**
 * Execute query with automatic fallback to Supabase
 * @param pbQuery - Primary PocketBase query function
 * @param sbQuery - Fallback Supabase query function
 * @param context - Logging context (e.g., 'load:transactions')
 */
export async function executeWithFallback<T>(
  pbQuery: () => Promise<T>,
  sbQuery: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    console.log(`[source:PB] ${context}`)
    const result = await pbQuery()
    console.log(`[source:PB] ${context} - success`)
    return result
  } catch (error) {
    if (isPocketBase400Or404(error)) {
      console.warn(`[source:PB] ${context} failed (${(error as any)?.status || '?'})`, error)
      console.log(`[source:SB] ${context} - falling back to Supabase`)
      try {
        const result = await sbQuery()
        console.log(`[source:SB] ${context} - success (fallback)`)
        return result
      } catch (sbError) {
        console.error(`[source:SB] ${context} - fallback also failed`, sbError)
        throw sbError
      }
    }
    // Rethrow auth errors and other non-recoverable errors
    console.error(`[source:PB] ${context} - non-recoverable error`, error)
    throw error
  }
}

/**
 * Execute multiple query attempts with fallback
 * Useful for PB schema drift handling
 */
export async function executeWithAttempts<T>(
  attempts: Array<() => Promise<T>>,
  context: string,
  sbQuery?: () => Promise<T>
): Promise<T> {
  let lastError: unknown
  
  for (let i = 0; i < attempts.length; i++) {
    try {
      console.log(`[source:PB] ${context} - attempt ${i + 1}/${attempts.length}`)
      const result = await attempts[i]()
      console.log(`[source:PB] ${context} - success on attempt ${i + 1}`)
      return result
    } catch (error) {
      lastError = error
      if (!isPocketBase400Or404(error)) {
        // Rethrow non-recoverable errors immediately
        console.error(`[source:PB] ${context} - non-recoverable error on attempt ${i + 1}`, error)
        throw error
      }
      console.warn(`[source:PB] ${context} - attempt ${i + 1} failed (${(error as any)?.status || '?'}), trying next...`)
    }
  }
  
  // All PB attempts failed, try Supabase
  if (sbQuery) {
    console.log(`[source:SB] ${context} - all PB attempts failed, falling back to Supabase`)
    try {
      const result = await sbQuery()
      console.log(`[source:SB] ${context} - success (fallback)`)
      return result
    } catch (sbError) {
      console.error(`[source:SB] ${context} - fallback also failed`, sbError)
      throw sbError
    }
  }
  
  // No fallback provided, rethrow last error
  console.error(`[source:PB] ${context} - all attempts exhausted, no fallback available`)
  throw lastError
}

/**
 * Log source tracking (for debugging data flow)
 */
export function logSource(source: 'PB' | 'SB', action: string, details?: any) {
  const prefix = `[source:${source}]`
  if (details) {
    console.log(`${prefix} ${action}`, details)
  } else {
    console.log(`${prefix} ${action}`)
  }
}
