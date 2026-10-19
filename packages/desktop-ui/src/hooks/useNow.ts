import { useEffect, useState } from 'react';

/** 每秒/可配置间隔刷新当前时间，用于计时器展示 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** 延迟挂载，避免首屏一次性渲染过多内容 */
export function useMounted(delayMs = 0): boolean {
  const [mounted, setMounted] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    const id = window.setTimeout(() => setMounted(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);
  return mounted;
}
