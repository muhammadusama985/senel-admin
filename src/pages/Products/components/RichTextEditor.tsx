import React, { useCallback, useRef } from 'react';
import { Box, Button, ButtonGroup, Tooltip, useTheme } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';

interface RichTextEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** Forwarded to the underlying <textarea> so the parent can still
   *  focus / read the caret position (insert image at cursor etc.). */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
}

/**
 * A lightweight rich-text editor that wraps a plain <textarea> with a
 * formatting toolbar. Buttons insert markdown-style syntax at the current
 * caret / around the current selection so the field stays a plain string
 * the rest of the app already understands:
 *
 *   Bold            **text**
 *   Italic          *text*
 *   Underline       __text__
 *   Bulleted list   "- item"
 *   Numbered list   "1. item"
 *
 * Existing image markdown `![alt](url)` (inserted by the description
 * image-upload button) is preserved untouched. No external rich-text lib
 * required.
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  textareaRef,
  rows,
  minRows,
  placeholder,
  disabled,
}) => {
  const muiTheme = useTheme();

  // Always keep our own ref so the toolbar handlers have a guaranteed node.
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  // Combine: write the node into BOTH refs so the parent can still read
  // selectionStart / value from its own ref after we mutate the DOM.
  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      localRef.current = node;
      if (textareaRef) {
        textareaRef.current = node;
      }
    },
    [textareaRef],
  );

  const applySyntax = (
    before: string,
    after: string,
    placeholderText?: string,
  ) => {
    const ta = localRef.current;
    if (!ta) {
      const insert = placeholderText ?? '';
      onChange((value || '') + before + insert + after);
      return;
    }
    const start = ta.selectionStart ?? (ta.value || '').length;
    const end = ta.selectionEnd ?? start;
    const current = ta.value || '';
    const selected = current.substring(start, end) || (placeholderText ?? '');
    const next =
      current.substring(0, start) + before + selected + after + current.substring(end);
    onChange(next);
    // Restore caret AFTER the inserted text on the next tick so React has
    // committed the new value back into the DOM.
    setTimeout(() => {
      const el = localRef.current;
      if (!el) return;
      el.focus();
      const caret = start + before.length + selected.length;
      el.setSelectionRange(caret, caret);
    }, 0);
  };

  const insertAtStartOfLine = (prefix: string) => {
    const ta = localRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? (ta.value || '').length;
    const current = ta.value || '';
    const lineStart = current.lastIndexOf('\n', start - 1) + 1;
    const next = current.substring(0, lineStart) + prefix + current.substring(lineStart);
    onChange(next);
    setTimeout(() => {
      const el = localRef.current;
      if (!el) return;
      el.focus();
      const caret = start + prefix.length;
      el.setSelectionRange(caret, caret);
    }, 0);
  };

  const handleBold = () => applySyntax('**', '**', 'bold text');
  const handleItalic = () => applySyntax('*', '*', 'italic text');
  const handleUnderline = () => applySyntax('__', '__', 'underlined text');
  const handleBullet = () => insertAtStartOfLine('- ');
  const handleNumber = () => insertAtStartOfLine('1. ');

  // Visual row count for the textarea. Plain HTML <textarea> only supports
  // `rows` so we use minRows (or rows) as the visible height to match the
  // previous MUI TextField footprint.
  const visualRows = rows ?? minRows ?? 4;

  const renderToolbarButton = (
    title: string,
    ariaLabel: string,
    onClick: () => void,
    icon: React.ReactNode,
  ) => (
    <Tooltip title={title} arrow>
      <span>
        <Button
          type="button"
          aria-label={ariaLabel}
          onClick={onClick}
          disabled={disabled}
          size="small"
          variant="outlined"
          sx={{
            minWidth: 36,
            height: 32,
            px: 1,
            color: 'text.primary',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
              borderColor: 'divider',
            },
            '&.Mui-disabled': {
              color: 'text.disabled',
            },
          }}
        >
          {icon}
        </Button>
      </span>
    </Tooltip>
  );

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    fontFamily: 'inherit',
    fontSize: '1rem',
    lineHeight: 1.5,
    color: muiTheme.palette.text.primary,
    backgroundColor: muiTheme.palette.background.paper,
    border: `1px solid ${muiTheme.palette.divider}`,
    borderRadius: 4,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: `${visualRows * 1.5}em`,
  };

  return (
    <Box sx={{ width: '100%' }}>
      <ButtonGroup
        size="small"
        sx={{
          mb: 0.5,
        }}
      >
        {renderToolbarButton('Bold', 'Bold', handleBold, <FormatBoldIcon fontSize="small" />)}
        {renderToolbarButton('Italic', 'Italic', handleItalic, <FormatItalicIcon fontSize="small" />)}
        {renderToolbarButton('Underline', 'Underline', handleUnderline, <FormatUnderlinedIcon fontSize="small" />)}
        {renderToolbarButton('Bulleted list', 'Bulleted list', handleBullet, <FormatListBulletedIcon fontSize="small" />)}
        {renderToolbarButton('Numbered list', 'Numbered list', handleNumber, <FormatListNumberedIcon fontSize="small" />)}
      </ButtonGroup>
      <textarea
        ref={setTextareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={visualRows}
        placeholder={placeholder}
        disabled={disabled}
        style={textareaStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = muiTheme.palette.primary.main;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = muiTheme.palette.divider;
        }}
      />
    </Box>
  );
};