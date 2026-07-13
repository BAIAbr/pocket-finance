import React from 'react';

// Renders Tiptap JSON to React. Supports the extension set we ship.
interface Node {
  type?: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
  content?: Node[];
}

function renderMarks(text: string, marks?: Node['marks']): React.ReactNode {
  if (!marks || marks.length === 0) return text;
  return marks.reduce<React.ReactNode>((acc, m) => {
    switch (m.type) {
      case 'bold':      return <strong>{acc}</strong>;
      case 'italic':    return <em>{acc}</em>;
      case 'underline': return <u>{acc}</u>;
      case 'strike':    return <s>{acc}</s>;
      case 'code':      return <code className="px-1 py-0.5 rounded bg-muted text-sm">{acc}</code>;
      case 'highlight': return <mark className="bg-yellow-200/60 dark:bg-yellow-500/25 px-0.5 rounded">{acc}</mark>;
      case 'link':
        return (
          <a
            href={m.attrs?.href}
            target={m.attrs?.target ?? '_blank'}
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {acc}
          </a>
        );
      default: return acc;
    }
  }, text);
}

function slugifyHeading(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function renderNode(node: Node, key: number): React.ReactNode {
  const children = node.content?.map((c, i) => renderNode(c, i));

  switch (node.type) {
    case 'doc':
      return <>{children}</>;
    case 'paragraph':
      return <p key={key} className="my-3 leading-relaxed">{children}</p>;
    case 'heading': {
      const level = Math.min(Math.max(node.attrs?.level ?? 2, 1), 6);
      const text = (node.content ?? []).map(c => c.text ?? '').join('');
      const id = slugifyHeading(text);
      const cls = [
        'text-4xl font-bold mt-8 mb-4 tracking-tight',
        'text-3xl font-bold mt-8 mb-4 tracking-tight',
        'text-2xl font-semibold mt-6 mb-3',
        'text-xl font-semibold mt-5 mb-2',
        'text-lg font-semibold mt-4 mb-2',
        'text-base font-semibold mt-4 mb-2',
      ][level - 1];
      const Tag = `h${level}` as any;
      return <Tag key={key} id={id} className={cls}>{children}</Tag>;
    }
    case 'bulletList':
      return <ul key={key} className="list-disc pl-6 my-3 space-y-1">{children}</ul>;
    case 'orderedList':
      return <ol key={key} className="list-decimal pl-6 my-3 space-y-1">{children}</ol>;
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'taskList':
      return <ul key={key} className="pl-1 my-3 space-y-1">{children}</ul>;
    case 'taskItem':
      return (
        <li key={key} className="flex items-start gap-2">
          <input type="checkbox" checked={!!node.attrs?.checked} readOnly className="mt-1.5 accent-primary" />
          <div className="flex-1">{children}</div>
        </li>
      );
    case 'blockquote':
      return (
        <blockquote key={key} className="my-4 pl-4 border-l-4 border-primary/60 italic text-muted-foreground">
          {children}
        </blockquote>
      );
    case 'codeBlock':
      return (
        <pre key={key} className="my-4 p-4 rounded-lg bg-muted overflow-x-auto text-sm">
          <code>{(node.content ?? []).map(c => c.text ?? '').join('')}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} className="my-6 border-border" />;
    case 'hardBreak':
      return <br key={key} />;
    case 'image':
      return (
        <img
          key={key}
          src={node.attrs?.src}
          alt={node.attrs?.alt ?? ''}
          className="my-4 rounded-lg max-w-full h-auto border border-border"
        />
      );
    case 'table':
      return (
        <div key={key} className="my-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">{children}</table>
        </div>
      );
    case 'tableRow':
      return <tr key={key} className="border-b border-border last:border-0">{children}</tr>;
    case 'tableHeader':
      return <th key={key} className="px-3 py-2 text-left font-semibold bg-muted">{children}</th>;
    case 'tableCell':
      return <td key={key} className="px-3 py-2 align-top">{children}</td>;
    case 'text':
      return <React.Fragment key={key}>{renderMarks(node.text ?? '', node.marks)}</React.Fragment>;
    default:
      return children ? <React.Fragment key={key}>{children}</React.Fragment> : null;
  }
}

export function DocumentRenderer({ doc }: { doc: any }) {
  if (!doc) return null;
  return <div className="prose-doc">{renderNode(doc, 0)}</div>;
}

// Extract headings for TOC
export function extractHeadings(doc: any): { id: string; text: string; level: number }[] {
  const out: { id: string; text: string; level: number }[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (n.type === 'heading') {
      const text = (n.content ?? []).map((c: any) => c.text ?? '').join('');
      out.push({ id: slugifyHeading(text), text, level: n.attrs?.level ?? 2 });
    }
    (n.content ?? []).forEach(walk);
  };
  walk(doc);
  return out;
}

// Plain-text extraction for search / PDF export
export function docToPlainText(doc: any): string {
  const parts: string[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (typeof n.text === 'string') parts.push(n.text);
    (n.content ?? []).forEach(walk);
    if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem') parts.push('\n');
  };
  walk(doc);
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}
