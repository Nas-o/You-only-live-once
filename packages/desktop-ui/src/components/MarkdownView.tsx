import { useMemo, type MouseEvent } from 'react';
import { FileText } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { openExternalUrl } from '../lib/links';

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'strong',
  'em',
  'del',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'input',
];

const ALLOWED_ATTR = [
  'href',
  'title',
  'class',
  'type',
  'checked',
  'disabled',
  'start',
  'colspan',
  'rowspan',
  'align',
];

function render(source: string): string {
  const parsed = marked.parse(source, {
    async: false,
    gfm: true,
    breaks: true,
  });
  if (typeof parsed !== 'string') return '';
  return DOMPurify.sanitize(parsed, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'img', 'video', 'audio'],
  });
}

/**
 * 学习文档的安全 Markdown 渲染。
 * 只允许阅读所需的标签与属性，链接交给系统浏览器打开。
 */
export function MarkdownView({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => render(source), [source]);

  if (!source.trim() || !html) {
    return (
      <div className={`md-empty ${className ?? ''}`}>
        <FileText size={22} />
        <strong>还没有内容</strong>
        <p>在「编写」里用标题、列表、引用和代码块，写成一份属于自己的学习文档。</p>
        <span># 标题　·　- 列表　·　&gt; 引用　·　``` 代码块</span>
      </div>
    );
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') ?? '';
    if (!href || href.startsWith('#')) return;
    event.preventDefault();
    void openExternalUrl(href);
  };

  return (
    <div
      className={`md-doc ${className ?? ''}`}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
