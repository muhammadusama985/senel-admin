import React, { useRef } from 'react';
import { Box, Button, ButtonGroup, Tooltip } from '@mui/material';
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
  maxRows?: number;
}

/**
 * A lightweight rich-text editor that wraps a <textarea> with a formatting
 * toolbar. Buttons insert markdown-style syntax at the current caret /
 * around the current selection so the field stays a plain string the rest
 * of the app already understands:
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
  maxRows,
  placeholder,
  disabled,
}) => {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = (textareaRef as React.RefObject<HTMLTextAreaElement | null>) || internalRef;

  const applySyntax = (
    before: string,
    after: string,
    placeholderText?: string,
  ) => {
    const ta = (ref as React.RefObject<HTMLTextAreaElement | null>).current;
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
    requestAnimationFrame(() => {
      const el = (ref as React.RefObject<HTMLTextAreaElement | null>).current;
      if (!el) return;
      el.focus();
      const caret = start + before.length + selected.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const insertAtStartOfLine = (prefix: string) => {
    const ta = (ref as React.RefObject<HTMLTextAreaElement | null>).current;
    if (!ta) return;
    const start = ta.selectionStart ?? (ta.value || '').length;
    const current = ta.value || '';
    const lineStart = current.lastIndexOf('\n', start - 1) + 1;
    const next = current.substring(0, lineStart) + prefix + current.substring(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      const el = (ref as React.RefObject<HTMLTextAreaElement | null>).current;
      if (!el) return;
      el.focus();
      const caret = start + prefix.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleBold = () => applySyntax('**', '**', 'bold text');
  const handleItalic = () => applySyntax('*', '*', 'italic text');
  const handleUnderline = () => applySyntax('__', '__', 'underlined text');
  const handleBullet = () => insertAtStartOfLine('- ');
  const handleNumber = () => insertAtStartOfLine('1. ');

  const toolbarBtnSx = {
    minWidth: 36,
    height: 32,
    px: 1,
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper',
    color: 'text.primary',
    borderRadius: 1,
    '&:hover': {
      backgroundColor: 'action.hover',
    },
    '&.Mui-disabled': {
      color: 'text.disabled',
    },
  };

  const toolbarButton = (
    label: string,
    ariaLabel: string,
    onClick: () => void,
    icon: React.ReactNode,
  ) => (
    <Tooltip title={label} arrow>
      <span>
        <Button
          type="button"
          aria-label={ariaLabel}
          onClick={onClick}
          disabled={disabled}
          size="small"
          sx={toolbarBtnSx}
        >
          {icon}
        </Button>
      </span>
    </Tooltip>
  );

  // Visual row count for the underlying textarea. Plain HTML <textarea>
  // only understands `rows` (fixed), so we use minRows as the visible
  // height so the field matches the previous MUI TextField footprint.
  const visualRows = rows ?? minRows ?? 4;

  return (
    <Box sx={{ width: '100%' }}>
      <ButtonGroup
        variant="outlined"
        size="small"
        sx={{
          mb: 0.5,
          '& .MuiButtonGroup-grouped': {
            borderColor: 'divider',
          },
        }}
      >
        {toolbarButton('Bold (Ctrl+B)', 'Bold', handleBold, <FormatBoldIcon fontSize="small" />)}
        {toolbarButton('Italic', 'Italic', handleItalic, <FormatItalicIcon fontSize="small" />)}
        {toolbarButton('Underline', 'Underline', handleUnderline, <FormatUnderlinedIcon fontSize="small" />)}
        {toolbarButton('Bulleted list', 'Bulleted list', handleBullet, <FormatListBulletedIcon fontSize="small" />)}
        {toolbarButton('Numbered list', 'Numbered list', handleNumber, <FormatListNumberedIcon fontSize="small" />)}
      </ButtonGroup>
      <Box
        component="textarea"
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        rows={visualRows}
        placeholder={placeholder}
        disabled={disabled}
        sx={{
          width: '100%',
          padding: '14px',
          fontFamily: 'inherit',
          fontSize: '1rem',
          lineHeight: 1.5,
          color: 'text.primary',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: `${visualRows * 1.5}em`,
          '&:focus': {
            borderColor: 'primary.main',
          },
          '&:focus-visible': {
            outline: 'none',
          },
          '&.Mui-disabled': {
            color: 'text.disabled',
            backgroundColor: 'action.disabledBackground',
          },
        }}
      />
    </Box>
  );
};