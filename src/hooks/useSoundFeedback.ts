import { useCallback } from "react";

type SoundType = "click" | "success" | "error" | "notification";

const AudioCtx = typeof window !== "undefined" ? window.AudioContext || (window as any).webkitAudioContext : null;

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

const sounds: Record<SoundType, () => void> = {
  click: () => playTone(800, 0.08, "sine", 0.08),
  success: () => {
    playTone(523, 0.12, "sine", 0.12);
    setTimeout(() => playTone(659, 0.12, "sine", 0.12), 100);
    setTimeout(() => playTone(784, 0.15, "sine", 0.12), 200);
  },
  error: () => {
    playTone(300, 0.15, "square", 0.1);
    setTimeout(() => playTone(250, 0.2, "square", 0.1), 150);
  },
  notification: () => {
    playTone(880, 0.1, "sine", 0.1);
    setTimeout(() => playTone(1100, 0.15, "sine", 0.1), 120);
  },
};

export function useSoundFeedback() {
  const enabled = typeof window !== "undefined"
    ? localStorage.getItem("theme_sounds") !== "false"
    : false;

  const play = useCallback((type: SoundType) => {
    if (!enabled) return;
    sounds[type]();
  }, [enabled]);

  const setEnabled = useCallback((v: boolean) => {
    localStorage.setItem("theme_sounds", String(v));
  }, []);

  return { play, enabled, setEnabled };
}
