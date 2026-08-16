export type DeviceLinkStatus = 'pending' | 'approved' | 'consumed';

export function isExpired(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}

export function canApprove(status: DeviceLinkStatus, expiresAt: string, now = Date.now()): boolean {
  return status === 'pending' && !isExpired(expiresAt, now);
}

export function canExchange(
  status: DeviceLinkStatus,
  expiresAt: string,
  consumedAt: string | null,
  now = Date.now(),
): boolean {
  return status === 'approved' && consumedAt === null && !isExpired(expiresAt, now);
}
