import { NextResponse } from 'next/server';

/**
 * Standard JSON response helper
 */
export function jsonResponse(
  data: any,
  status: number = 200,
  headers?: Record<string, string>
) {
  return NextResponse.json(data, { status, headers });
}

/**
 * Success response
 */
export function successResponse(data: any, status: number = 200) {
  return jsonResponse({ success: true, ...data }, status);
}

/**
 * Error response
 */
export function errorResponse(
  error: string | Error,
  status: number = 500
) {
  const message = typeof error === 'string' ? error : error.message;
  return jsonResponse({ success: false, error: message }, status);
}

/**
 * Handle async route errors
 */
export async function handleRouteError(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error: any) {
    console.error('[API Error]', error);
    
    // Handle specific error types
    if (error.message === 'UNAUTHORIZED') {
      return errorResponse('Token is not valid or missing', 401);
    }
    
    if (error.message === 'FORBIDDEN') {
      return errorResponse('Access denied', 403);
    }
    
    if (error.message?.includes('not found')) {
      return errorResponse(error.message, 404);
    }
    
    return errorResponse(error.message || 'Internal Server Error', 500);
  }
}
