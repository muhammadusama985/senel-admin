import React, { useLayoutEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  minHeight?: string;
}

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'UL', 'OL', 'LI', 'DIV']);

export const sanitizeHtml = (html: string): string => {
  const documentFragment = new DOMParser().parseFromString(html || '', 'text/html');

  const cleanNode = (node: Node): void => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (!ALLOWED_TAGS.has(element.tagName)) {
          const parent = element.parentNode;
          if (parent) {
            cleanNode(element);
            while (element.firstChild) parent.insertBefore(element.firstChild, element);
            parent.removeChild(element);
          }
          return;
        }
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
        cleanNode(element);
      }
    });
  };

  cleanNode(documentFragment.body);
  return documentFragment.body.innerHTML;
};

const TOOLBAR_BUTTONS = [
  { command: 'bold', label: 'B', title: 'Bold' },
  { command: 'italic', label: 'I', title: 'Italic' },
  { command: 'underline', label: 'U', title: 'Underline' },
  { command: 'insertUnorderedList', label: '• List', title: 'Bulleted list' },
  { command: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
] as const;

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, label, minHeight = '132px' }) => {
  const theme = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const initializedRef = useRef(false);
  const border = theme.palette.divider;
  const background = theme.palette.background.paper;
  const text = theme.palette.text.primary;

  useLayoutEffect(() => {
    if (editorRef.current && (!initializedRef.current || value !== lastValueRef.current)) {
      editorRef.current.innerHTML = sanitizeHtml(value);
      lastValueRef.current = value;
      initializedRef.current = true;
    }
  }, [value]);

  const runCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    const html = sanitizeHtml(editorRef.current?.innerHTML || '');
    lastValueRef.current = html;
    onChange(html);
  };

  return (
    <div>
      {label && <div style={{ marginBottom: '0.5rem', color: text, fontSize: '0.875rem' }}>{label}</div>}
      <div style={{ border: `1px solid ${border}`, borderRadius: '4px', overflow: 'hidden', backgroundColor: background }}>
      <div
        role="toolbar"
        aria-label="Text formatting"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          flexWrap: 'wrap',
          padding: '0.45rem',
          borderBottom: `1px solid ${border}`,
          backgroundColor: background,
        }}
      >
        {TOOLBAR_BUTTONS.map((button) => (
          <button
            key={button.command}
            type="button"
            title={button.title}
            aria-label={button.title}
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand(button.command);
            }}
            style={{
              minWidth: button.command.includes('List') ? '62px' : '32px',
              padding: '0.35rem 0.5rem',
              border: `1px solid ${border}`,
              borderRadius: '4px',
              background: 'transparent',
              color: text,
              cursor: 'pointer',
              fontWeight: button.command === 'bold' ? 700 : 400,
              fontStyle: button.command === 'italic' ? 'italic' : 'normal',
              textDecoration: button.command === 'underline' ? 'underline' : 'none',
            }}
          >
            {button.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={() => {
          const html = sanitizeHtml(editorRef.current?.innerHTML || '');
          lastValueRef.current = html;
          onChange(html);
        }}
        style={{
          minHeight,
          padding: '0.75rem',
          color: text,
          outline: 'none',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
        }}
      />
    </div>
    </div>
  );
};
