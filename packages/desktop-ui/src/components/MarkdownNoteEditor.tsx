import { useEffect, useRef, useState } from 'react';
import { formatClock, formatDayKeyCN, formatMinutes, type FocusSession, type WritingLog } from '@yolo/core';
import {
  Bold,
  Check,
  Code2,
  Columns2,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListChecks,
  Maximize2,
  Minimize2,
  PenLine,
  Pencil,
  Quote,
  Save,
  SquareCode,
} from 'lucide-react';
import { MarkdownView } from './MarkdownView';

type DocMode = 'write' | 'preview' | 'split';

interface WritingInput {
  startedAt: string;
  endedAt: string;
  seconds: number;
  sessionId?: string;
}

interface MarkdownNoteEditorProps {
  taskTitle: string;
  value: string;
  dirty: boolean;
  saving: boolean;
  sessions: FocusSession[];
  writingLogs: WritingLog[];
  onChange: (value: string) => void;
  onSave: () => void;
  onLogWriting: (input: WritingInput) => void;
}

export function MarkdownNoteEditor({
  taskTitle,
  value,
  dirty,
  saving,
  sessions,
  writingLogs,
  onChange,
  onSave,
  onLogWriting,
}: MarkdownNoteEditorProps) {
  const [mode, setMode] = useState<DocMode>('write');
  const [expanded, setExpanded] = useState(false);
  const [linkedSessionId, setLinkedSessionId] = useState(sessions[0]?.id ?? '');
  const [writingStartedAt, setWritingStartedAt] = useState<number | null>(null);
  const [writingElapsed, setWritingElapsed] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const writingStartedRef = useRef<number | null>(null);
  const linkedSessionRef = useRef(linkedSessionId);
  const onLogWritingRef = useRef(onLogWriting);

  useEffect(() => {
    onLogWritingRef.current = onLogWriting;
  }, [onLogWriting]);

  useEffect(() => {
    linkedSessionRef.current = linkedSessionId;
  }, [linkedSessionId]);

  useEffect(() => {
    if (!linkedSessionId && sessions[0]) setLinkedSessionId(sessions[0].id);
  }, [sessions, linkedSessionId]);

  useEffect(() => {
    if (!writingStartedAt) return;
    const tick = () => setWritingElapsed(Math.max(0, Math.floor((Date.now() - writingStartedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [writingStartedAt]);

  useEffect(() => {
    return () => {
      const startedAt = writingStartedRef.current;
      if (!startedAt) return;
      const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      writingStartedRef.current = null;
      if (seconds >= 5) {
        onLogWritingRef.current({
          startedAt: new Date(startedAt).toISOString(),
          endedAt: new Date().toISOString(),
          seconds,
          sessionId: linkedSessionRef.current || undefined,
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!expanded && mode === 'split') setMode('write');
  }, [expanded, mode]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setExpanded(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [expanded]);

  const focusSelection = (start: number, end: number) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  const replaceSelection = (before: string, after: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    focusSelection(start + before.length, start + before.length + selected.length);
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const label = value.slice(start, end) || '链接文字';
    const url = 'https://';
    const next = `${value.slice(0, start)}[${label}](${url})${value.slice(end)}`;
    onChange(next);
    const urlStart = start + 1 + label.length + 2;
    focusSelection(urlStart, urlStart + url.length);
  };

  const insertCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const body = value.slice(start, end) || '在这里写代码';
    const before = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    const after = end < value.length && value[end] !== '\n' ? '\n' : '';
    const block = `${before}\`\`\`\n${body}\n\`\`\`\n${after}`;
    onChange(value.slice(0, start) + block + value.slice(end));
    focusSelection(start + block.length, start + block.length);
  };

  const applyLinePrefix = (prefix: string, matcher: RegExp) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const allPrefixed = lines.every((line) => matcher.test(line));
    const nextLines = lines.map((line) => {
      if (allPrefixed) return line.replace(matcher, '');
      if (matcher.test(line)) return line.replace(matcher, prefix);
      return prefix + line;
    });
    const nextBlock = nextLines.join('\n');
    onChange(value.slice(0, lineStart) + nextBlock + value.slice(lineEnd));
    focusSelection(lineStart, lineStart + nextBlock.length);
  };

  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    onChange(value.slice(0, start) + text + value.slice(end));
    focusSelection(start + text.length, start + text.length);
  };

  const startWriting = () => {
    const now = Date.now();
    writingStartedRef.current = now;
    setWritingStartedAt(now);
    setWritingElapsed(0);
  };

  const stopWriting = () => {
    const startedAt = writingStartedRef.current;
    if (!startedAt) return;
    const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    writingStartedRef.current = null;
    setWritingStartedAt(null);
    setWritingElapsed(0);
    if (seconds >= 5) {
      onLogWriting({
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        seconds,
        sessionId: linkedSessionId || undefined,
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) {
      if (event.key === 'Tab') {
        event.preventDefault();
        insertText('  ');
      }
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      replaceSelection('**', '**', '重点');
    } else if (key === 'i') {
      event.preventDefault();
      replaceSelection('*', '*', '强调');
    } else if (key === 'k') {
      event.preventDefault();
      insertLink();
    } else if (key === 's') {
      event.preventDefault();
      onSave();
    }
  };

  const toolbarButton = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
  ) => (
    <button
      type="button"
      className="doc-tool"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      {icon}
    </button>
  );

  const charCount = value.trim().length;
  const saveState = dirty ? '编辑中 · 将自动保存' : saving ? '保存中…' : charCount > 0 ? '已保存' : '空白文档';

  return (
    <section className={`detail-section note-section ${expanded ? 'is-expanded' : ''}`}>
      <div className="section-head note-section-head">
        <div>
          <h3>
            学习文档
            {expanded ? <span className="note-doc-task"> · {taskTitle}</span> : null}
          </h3>
          <p>用 Markdown 写下概念、代码、卡点与下一步。内容只保存在本机。</p>
        </div>
        <div className="note-head-actions">
          {dirty ? (
            <button type="button" className="btn btn-primary btn-small" onClick={onSave}>
              <Save size={14} /> 保存
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-small note-expand-btn"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            title={expanded ? '收起文档' : '展开全屏写作'}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{expanded ? '收起' : '展开写作'}</span>
          </button>
        </div>
      </div>

      <div className="doc-writing-bar">
        <div className="doc-writing-copy">
          <span className="doc-writing-label">
            <PenLine size={14} /> 写作计时
          </span>
          <span className="doc-writing-note">
            {writingStartedAt
              ? `正在记录 ${formatClock(writingElapsed)}，结束后会计入学习文档`
              : '写文档也可以计入学习；停笔时自动记账。'}
          </span>
        </div>
        <div className="doc-writing-controls">
          <select
            className="doc-session-select"
            value={linkedSessionId}
            onChange={(event) => setLinkedSessionId(event.target.value)}
            aria-label="关联到哪次学习"
          >
            <option value="">不关联本次学习</option>
            {sessions.slice(0, 12).map((session) => (
              <option key={session.id} value={session.id}>
                {formatDayKeyCN(session.endedAt.slice(0, 10))}{' '}
                {new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                {Math.max(1, Math.round(session.seconds / 60))} 分钟
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`btn btn-small ${writingStartedAt ? 'btn-primary' : 'btn-ghost'}`}
            onClick={writingStartedAt ? stopWriting : startWriting}
          >
            {writingStartedAt ? <Check size={13} /> : <PenLine size={13} />}
            {writingStartedAt ? '结束并记录' : '开始写作'}
          </button>
        </div>
      </div>
      <div className="note-editor">
        <div className="doc-editor-head">
          <div className="doc-tabs" role="tablist" aria-label="学习文档视图">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'write'}
              className={mode === 'write' ? 'is-active' : ''}
              onClick={() => setMode('write')}
            >
              <Pencil size={13} /> 编写
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'preview'}
              className={mode === 'preview' ? 'is-active' : ''}
              onClick={() => setMode('preview')}
            >
              <Eye size={13} /> 预览
            </button>
            {expanded ? (
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'split'}
                className={`doc-tab-split ${mode === 'split' ? 'is-active' : ''}`}
                onClick={() => setMode('split')}
              >
                <Columns2 size={13} /> 分栏
              </button>
            ) : null}
          </div>
          <span className="doc-format">MARKDOWN</span>
        </div>

        <div className={`doc-body ${mode === 'split' && expanded ? 'is-split' : ''}`}>
          {mode !== 'preview' ? (
            <div className="doc-write-pane">
              <div className="doc-toolbar" role="toolbar" aria-label="Markdown 格式工具">
                <div className="doc-tool-group">
                  {toolbarButton('二级标题', <Heading2 size={15} />, () => applyLinePrefix('## ', /^#{1,6}\s+/))}
                  {toolbarButton('粗体', <Bold size={15} />, () => replaceSelection('**', '**', '重点'))}
                  {toolbarButton('斜体', <Italic size={15} />, () => replaceSelection('*', '*', '强调'))}
                  {toolbarButton('行内代码', <Code2 size={15} />, () => replaceSelection('`', '`', '代码'))}
                </div>
                <span className="doc-tool-sep" />
                <div className="doc-tool-group">
                  {toolbarButton('无序列表', <List size={15} />, () => applyLinePrefix('- ', /^[-*+]\s+/))}
                  {toolbarButton('任务清单', <ListChecks size={15} />, () =>
                    applyLinePrefix('- [ ] ', /^[-*+]\s+\[[ xX]\]\s+/),
                  )}
                  {toolbarButton('引用', <Quote size={15} />, () => applyLinePrefix('> ', /^>\s?/))}
                </div>
                <span className="doc-tool-sep" />
                <div className="doc-tool-group">
                  {toolbarButton('链接', <Link2 size={15} />, insertLink)}
                  {toolbarButton('代码块', <SquareCode size={15} />, insertCodeBlock)}
                </div>
              </div>
              <textarea
                ref={textareaRef}
                className="note-area doc-textarea"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={'## 今天搞清楚了什么\n\n- 写下三个关键点\n- [ ] 留一个下次要验证的问题\n\n```js\n// 也可以贴代码\n```'}
                spellCheck={false}
                rows={8}
                aria-label="学习文档 Markdown 编辑器"
              />
            </div>
          ) : null}

          {mode !== 'write' ? (
            <div className="doc-preview-pane">
              <MarkdownView source={value} />
            </div>
          ) : null}
        </div>

        <div className="doc-foot">
          <span>{charCount > 0 ? `${charCount} 字` : '空白文档'}</span>
          <span className={`doc-save-state ${dirty ? 'is-dirty' : ''}`} aria-live="polite">
            {saveState}
          </span>
          <span className="doc-shortcut">Ctrl / ⌘ + S</span>
        </div>
      </div>
      {writingLogs.length > 0 ? (
        <div className="doc-writing-history">
          <span className="doc-writing-history-total">
            写作记录 {writingLogs.length} 次 · 共 {formatMinutes(Math.round(writingLogs.reduce((sum, log) => sum + log.seconds, 0) / 60))}
          </span>
          <div className="doc-writing-history-list">
            {writingLogs.slice(-3).reverse().map((log) => {
              const linked = log.sessionId ? sessions.find((session) => session.id === log.sessionId) : undefined;
              return (
                <span key={log.id}>
                  {formatDayKeyCN(log.endedAt.slice(0, 10))}{' '}
                  {new Date(log.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                  {Math.max(1, Math.round(log.seconds / 60))} 分钟
                  {linked
                    ? ` → ${formatDayKeyCN(linked.endedAt.slice(0, 10))} ${new Date(linked.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : ' · 独立'}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
