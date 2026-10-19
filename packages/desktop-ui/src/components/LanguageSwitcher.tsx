import { useEffect, useRef, useState } from 'react';
import { Check, Globe2 } from 'lucide-react';
import type { Language } from '@yolo/core';
import { useAppStore } from '../store/appStore';

const LANGUAGES: { id: Language; native: string; short: string }[] = [
  { id: 'zh', native: '中文', short: '中' },
  { id: 'ja', native: '日本語', short: '日' },
  { id: 'ko', native: '한국어', short: '한' },
  { id: 'en', native: 'English', short: 'EN' },
];

export function LanguageSwitcher() {
  const language = useAppStore((s) => s.data.settings.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((item) => item.id === language) ?? LANGUAGES[0]!;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="language-switcher" ref={ref} data-i18n-skip>
      <button
        type="button"
        className="icon-btn language-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`界面语言 · ${current.native}`}
        aria-label={`界面语言，当前 ${current.native}`}
      >
        <Globe2 size={16} />
        <span className="language-toggle-label">{current.short}</span>
      </button>
      {open ? (
        <div className="language-menu" role="menu">
          {LANGUAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={item.id === language}
              className={item.id === language ? 'is-active' : ''}
              onClick={() => {
                setLanguage(item.id);
                setOpen(false);
              }}
            >
              <span>{item.native}</span>
              <small>{item.id === 'zh' ? 'Chinese' : item.id === 'ja' ? 'Japanese' : item.id === 'ko' ? 'Korean' : 'English'}</small>
              {item.id === language ? <Check size={13} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
