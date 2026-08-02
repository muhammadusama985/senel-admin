import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Box, Button, ButtonGroup, Tooltip, useTheme } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import { resolveMediaUrl } from '../../../utils/media';

export interface RichTextEditorHandle {
  /**
   * Insert an <img> tag at the current cursor position inside the editor.
   * Used by the "+ Insert Image" button so the embedded photo becomes a
   * real image inside the editor (WYSIWYG), not a markdown placeholder.
   */
  insertImage: (url: string, alt?: string) => void;
  focus: () => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** Used so the parent's "Insert Image" button can call insertImage(). */
  editorRef?: React.Ref<RichTextEditorHandle>;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
}

/**
 * WYSIWYG rich-text editor. The underlying field is a contentEditable
 * <div>, so formatting (bold / italic / underline / bullets / numbered
 * lists) is applied immediately on the selected text via
 * document.execCommand. The result is stored as an HTML string the
 * parent already passes through (description / descriptionML.*).
 *
 * Existing markdown image references that may already live in the
 * description are left untouched here -- the customer-side renderer
 * handles both formats.
 *
 * Browser-default behaviour handles auto-incrementing ordered lists when
 * the user presses Enter inside an <li>, so pressing Enter continues
 * 1 -> 2 -> 3 automatically.
 */
export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ value, onChange, rows, minRows, placeholder, disabled }, ref) => {
    const muiTheme = useTheme();
    const contentRef = useRef<HTMLDivElement | null>(null);
    const skipNextSync = useRef(false);

    // Controlled sync: when the parent hands us a new value string
    // (e.g. product loaded from the backend, language switched), push it
    // into the <div>. We only do this when the DOM content actually
    // differs so we don't stomp on the user's cursor.
    useEffect(() => {
      const el = contentRef.current;
      if (!el) return;
      if (skipNextSync.current) {
        skipNextSync.current = false;
        return;
      }
      const incoming = value ?? '';
      if (el.innerHTML !== incoming) {
        el.innerHTML = incoming;
      }
    }, [value]);

    const syncToState = useCallback(() => {
      const el = contentRef.current;
      if (!el) return;
      const html = el.innerHTML;
      skipNextSync.current = true;
      onChange(html);
    }, [onChange]);

    useImperativeHandle(
      ref,
      (): RichTextEditorHandle => ({
        insertImage: (url: string, alt?: string) => {
          const el = contentRef.current;
          if (!el) return;
          el.focus();

          // The src must be a FULL absolute URL (not the raw
          // `/uploads/foo.png` the backend returns), otherwise the browser
          // tries to load the image from the editor's own origin (e.g. the
          // admin/vite dev server) and silently 404s -- which looks exactly
          // like "the image vanished". Resolving with resolveMediaUrl
          // prepends the backend origin so the picture actually loads.
          const resolvedSrc = resolveMediaUrl(url) || url;
          const img = document.createElement('img');
          img.src = resolvedSrc;
          img.className = 'rte-embedded-image';
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.margin = '0.5rem 0';
          img.style.borderRadius = '4px';
          img.setAttribute('loading', 'lazy');
          // Empty alt: no URL, no filename shows on hover or when the
          // image fails to load.
          img.setAttribute('alt', '');

          // Browser quirk cleanup: some engines wrap the freshly-assigned
          // src in a sibling TEXT NODE inside the contentEditable, making
          // the URL appear as visible text right next to the image. We
          // sweep any such node out AFTER the image is in the DOM so only
          // the visual <img> remains.
          const stripUrlTextNode = (sibling: ChildNode | null): ChildNode | null => {
            let cur = sibling;
            while (cur && cur.nodeType === Node.TEXT_NODE) {
              const text = cur.textContent || '';
              if (text.includes(url) || text.includes(resolvedSrc)) {
                const toRemove = cur;
                cur = cur.nextSibling;
                toRemove.parentNode?.removeChild(toRemove);
              } else {
                break;
              }
            }
            return cur;
          };

          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (el.contains(range.commonAncestorContainer)) {
              range.deleteContents();
              range.insertNode(img);
              stripUrlTextNode(img.nextSibling);
              stripUrlTextNode(img.previousSibling);
              const br = document.createElement('br');
              img.parentNode?.insertBefore(br, img.nextSibling);
              range.setStartAfter(br);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              syncToState();
              return;
            }
          }
          el.appendChild(img);
          stripUrlTextNode(img.nextSibling);
          el.appendChild(document.createElement('br'));
          syncToState();
        },
        focus: () => contentRef.current?.focus(),
      }),
      [syncToState],
    );

    const exec = (cmd: string) => {
      contentRef.current?.focus();
      document.execCommand(cmd, false);
      syncToState();
    };

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
      outline: 'none',
      boxSizing: 'border-box',
      minHeight: `${visualRows * 1.5}em`,
      // Cap the editor area and scroll internally when the content grows,
      // so the surrounding form grid never stretches to infinity.
      maxHeight: 360,
      overflowY: 'auto',
    };

    return (
      <Box sx={{ width: '100%' }}>
        <ButtonGroup size="small" sx={{ mb: 0.5 }}>
          {renderToolbarButton('Bold', 'Bold', () => exec('bold'), <FormatBoldIcon fontSize="small" />)}
          {renderToolbarButton('Italic', 'Italic', () => exec('italic'), <FormatItalicIcon fontSize="small" />)}
          {renderToolbarButton('Underline', 'Underline', () => exec('underline'), <FormatUnderlinedIcon fontSize="small" />)}
          {renderToolbarButton('Bulleted list', 'Bulleted list', () => exec('insertUnorderedList'), <FormatListBulletedIcon fontSize="small" />)}
          {renderToolbarButton('Numbered list', 'Numbered list', () => exec('insertOrderedList'), <FormatListNumberedIcon fontSize="small" />)}
        </ButtonGroup>
        <div
          ref={contentRef}
          className="rte-content"
          contentEditable={disabled ? false : true}
          suppressContentEditableWarning
          onInput={syncToState}
          onBlur={syncToState}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setTimeout(syncToState, 0);
            }
          }}
          data-placeholder={placeholder}
          style={textareaStyle}
        />
      </Box>
    );
  },
);

RichTextEditor.displayName = 'RichTextEditor';