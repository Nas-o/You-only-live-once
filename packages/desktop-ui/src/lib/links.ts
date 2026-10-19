export async function openExternalUrl(url: string | undefined): Promise<void> {
  if (!url) return;
  const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (typeof window !== 'undefined' && window.yolo) {
    await window.yolo.openExternal(safe);
  } else {
    window.open(safe, '_blank', 'noopener,noreferrer');
  }
}
