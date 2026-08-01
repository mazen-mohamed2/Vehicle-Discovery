export function scheduleSessionExpiry(
  expiresAt: string,
  onExpire: () => void,
  now = Date.now(),
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = setTimeout,
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout,
) {
  const delay = Math.max(0, Date.parse(expiresAt) - now);
  const timer = schedule(onExpire, delay);
  return () => cancel(timer);
}
