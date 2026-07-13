import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useEffect } from 'react';
import {
  Bold, Italic, Underline as U, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Minus, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Highlighter, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: any;
  onChange: (json: any) => void;
  placeholder?: string;
}

function ToolbarButton({ active, onClick, children, title }: any) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'p-2 rounded-md hover:bg-muted transition-colors',
        active && 'bg-primary/15 text-primary'
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const promptLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL:', prev ?? 'https://');
    if (url === null) return;
    if (url === '') editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  const insertImage = () => {
    const url = window.prompt('URL da imagem:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap gap-0.5 items-center p-2 border-b border-border bg-background/95 backdrop-blur">
      <ToolbarButton title="Desfazer" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></ToolbarButton>
      <ToolbarButton title="Refazer" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></ToolbarButton>
      <span className="w-px h-6 bg-border mx-1" />
      <ToolbarButton title="H1" active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></ToolbarButton>
      <ToolbarButton title="H2" active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolbarButton>
      <ToolbarButton title="H3" active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolbarButton>
      <span className="w-px h-6 bg-border mx-1" />
      <ToolbarButton title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarButton>
      <ToolbarButton title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarButton>
      <ToolbarButton title="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><U size={16} /></ToolbarButton>
      <ToolbarButton title="Riscado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolbarButton>
      <ToolbarButton title="Marca-texto" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={16} /></ToolbarButton>
      <ToolbarButton title="Código" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code size={16} /></ToolbarButton>
      <span className="w-px h-6 bg-border mx-1" />
      <ToolbarButton title="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></ToolbarButton>
      <ToolbarButton title="Numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolbarButton>
      <ToolbarButton title="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks size={16} /></ToolbarButton>
      <ToolbarButton title="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarButton>
      <ToolbarButton title="Separador" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /></ToolbarButton>
      <span className="w-px h-6 bg-border mx-1" />
      <ToolbarButton title="Link" active={editor.isActive('link')} onClick={promptLink}><LinkIcon size={16} /></ToolbarButton>
      <ToolbarButton title="Imagem" onClick={insertImage}><ImageIcon size={16} /></ToolbarButton>
      <ToolbarButton title="Tabela" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={16} /></ToolbarButton>
      <span className="w-px h-6 bg-border mx-1" />
      <ToolbarButton title="Esquerda" onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={16} /></ToolbarButton>
      <ToolbarButton title="Centro" onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={16} /></ToolbarButton>
      <ToolbarButton title="Direita" onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={16} /></ToolbarButton>
    </div>
  );
}

export function RichEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Comece a escrever...' }),
    ],
    content: value ?? { type: 'doc', content: [] },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class: 'prose-doc min-h-[400px] p-6 focus:outline-none max-w-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    // Only replace when value changes externally (e.g. restoring a version)
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value ?? { type: 'doc', content: [] }, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
