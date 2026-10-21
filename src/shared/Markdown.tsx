import { Fragment, type ReactNode } from 'react';

/** Minimaler Markdown-Renderer (Überschriften, Listen, Absätze, **fett**, *kursiv*) ohne zusätzliche Abhängigkeit. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(
      tok.startsWith('**') ? <strong key={i++}>{tok.slice(2, -2)}</strong> : <em key={i++}>{tok.slice(1, -1)}</em>,
    );
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n');
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length}>
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
      para = [];
    }
  };

  for (const line of lines) {
    if (/^\s*$/.test(line)) {
      flushList();
      flushPara();
    } else if (line.startsWith('## ')) {
      flushList();
      flushPara();
      blocks.push(<h3 key={blocks.length}>{inline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      flushList();
      flushPara();
      blocks.push(<h2 key={blocks.length}>{inline(line.slice(2))}</h2>);
    } else if (/^\s*[-*] /.test(line)) {
      flushPara();
      list.push(line.replace(/^\s*[-*] /, ''));
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushList();
  flushPara();
  return <Fragment>{blocks}</Fragment>;
}
