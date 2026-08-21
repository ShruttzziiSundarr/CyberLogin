/** Normalized error shape for anything that goes wrong talking to the identity provider admin API. */
export class PingFederateApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'PingFederateApiError';
    this.status = status;
    this.code = code;
  }
}

/** Maps an axios-style error (or anything else) into a PingFederateApiError, without leaking raw upstream payloads. */
export function mapUpstreamError(err: unknown): PingFederateApiError {
  const anyErr = err as {
    response?: { status?: number; data?: { resultId?: string; message?: string; validationErrors?: Array<{ message?: string }> } };
    code?: string;
    message?: string;
  };

  if (anyErr?.response) {
    const status = anyErr.response.status ?? 502;
    const data = anyErr.response.data;
    const validationMessage = data?.validationErrors?.map((v) => v.message).filter(Boolean).join('; ');
    const message = validationMessage || data?.message || 'PingFederate admin API request failed';
    const code = data?.resultId || `PF_HTTP_${status}`;
    return new PingFederateApiError(status, code, message);
  }

  if (anyErr?.code === 'ECONNREFUSED' || anyErr?.code === 'ENOTFOUND' || anyErr?.code === 'ETIMEDOUT') {
    return new PingFederateApiError(503, 'PF_UNREACHABLE', 'Unable to reach the PingFederate admin API');
  }

  return new PingFederateApiError(502, 'PF_UNKNOWN_ERROR', 'Unexpected error communicating with PingFederate');
}
