import { useState, useCallback, useRef } from "react";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60_000,      // 1 minute
  lockoutMs: 120_000,    // 2 minutes de blocage
};

export function useRateLimit(config: Partial<RateLimitConfig> = {}) {
  const { maxAttempts, windowMs, lockoutMs } = { ...DEFAULT_CONFIG, ...config };
  const attemptsRef = useRef<number[]>([]);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback((until: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const update = () => {
      const left = Math.ceil((until - Date.now()) / 1000);
      if (left <= 0) {
        setRemainingSeconds(0);
        setLockedUntil(null);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      setRemainingSeconds(left);
    };
    update();
    timerRef.current = setInterval(update, 1000);
  }, []);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();

    // Si verrouillé
    if (lockedUntil && now < lockedUntil) return false;

    // Nettoyer les tentatives hors fenêtre
    attemptsRef.current = attemptsRef.current.filter((t) => now - t < windowMs);

    if (attemptsRef.current.length >= maxAttempts) {
      const until = now + lockoutMs;
      setLockedUntil(until);
      startCountdown(until);
      return false;
    }

    attemptsRef.current.push(now);
    return true;
  }, [lockedUntil, maxAttempts, windowMs, lockoutMs, startCountdown]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  return { checkRateLimit, isLocked, remainingSeconds };
}
