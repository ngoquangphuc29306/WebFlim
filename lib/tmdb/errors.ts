export type TmdbErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'INVALID_IDENTITY'
  | 'ABORTED';

export interface TmdbError {
  code: TmdbErrorCode;
  message: string;
  url?: string;
  statusCode?: number;
  retryAfterMs?: number;
  cause?: string;
}

export type TmdbResult<T> = {
  data: T | null;
  error: TmdbError | null;
};

export function tmdbFailure<T>(error: TmdbError): TmdbResult<T> {
  return { data: null, error };
}
