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
  /**
   * Image URLs to display BELOW the editor as a thumbnail strip with a
   * delete button on each. The contentEditable never holds any image
   * markup -- so the URL is never written as visible text in the
   * description field. Pairs with onImagesChange / insertImage.
   */
  images?: string[];
  onImagesChange?: (next: string[]) => void;
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
  ({ value, onChange, rows, minRows, placeholder, disabled, images, onImagesChange }, ref) => {
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
        insertImage: (url: string) => {
          if (!url) return;
          // The image is NOT inserted inline in the contentEditable -- it
          // is appended to the separate `images` array and rendered as a
          // thumbnail strip UNDER the description. This keeps the URL out
          // of the contentEditable entirely, so it never appears as text
          // in the description.
          if (onImagesChange) {
            const current = images ?? [];
            if (current.indexOf(url) === -1) {
              onImagesChange([...current, url]);
            }
          }
        },
        focus: () => contentRef.current?.focus(),
      }),
      [onImagesChange, images],
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
        {images && images.length > 0 && (
          <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {images.map((url, idx) => {
              const thumbSrc = resolveMediaUrl(url) || url;
              return (
                <Box
                  key={`rte-img-${idx}-${url}`}
                  className="desc-image-chip"
                  title={url}
                >
                  <Box
                    component="img"
                    src={thumbSrc}
                    alt=""
                    className="desc-image-chip-thumb"
                  />
                  <button
                    type="button"
                    aria-label="Remove this image from the description"
                    className="desc-image-chip-remove"
                    onClick={() => {
                      if (disabled) return;
                      if (onImagesChange) {
                        onImagesChange((images ?? []).filter((u) => u !== url));
                      }
                    }}
                  >
                    &#8722;
                  </button>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  },
);

RichTextEditor.displayName = 'RichTextEditor';