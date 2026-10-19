/** 轻量 ID 生成：优先使用平台 crypto，退化到时间戳 + 随机串。 */

let counter = 0;

export function makeId(prefix = ''): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}${cryptoObj.randomUUID()}`;
  }
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** 稳定的伪随机数（用于示例数据与星图布局） */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
