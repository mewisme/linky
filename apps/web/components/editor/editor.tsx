import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { useEffect, useRef } from "react";

import { BlockNoteView, type ShadCNComponents } from "@blocknote/shadcn";
import { cn } from "@repo/ui/lib/utils";
import * as Button from "@repo/ui/components/ui/button";
import * as Badge from "@repo/ui/components/ui/badge";
import * as Avatar from "@repo/ui/components/ui/avatar";
import * as Card from "@repo/ui/components/ui/card";
import * as DropdownMenu from "@repo/ui/components/ui/dropdown-menu";
import * as Input from "@repo/ui/components/ui/input";
import * as Label from "@repo/ui/components/ui/label";
import * as Popover from "@repo/ui/components/ui/popover";
import * as Tooltip from "@repo/ui/components/ui/tooltip";
import * as Select from "@repo/ui/components/ui/select";
import * as Skeleton from "@repo/ui/components/ui/skeleton";
import * as Tabs from "@repo/ui/components/ui/tabs";
import * as Toggle from "@repo/ui/components/ui/toggle";
import * as Form from "@repo/ui/components/ui/form";

interface EditorProps {
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  editable?: boolean;
}

const shadCNComponents: ShadCNComponents = {
  Avatar,
  Badge,
  Button,
  Card,
  DropdownMenu,
  Input,
  Label,
  Popover,
  Tooltip,
  Select,
  Skeleton,
  Tabs,
  Toggle,
  Form: {
    Form: Form.Form as any,
  },
};

export function Editor({ className, value = '', onChange, editable = true }: EditorProps) {
  const editor = useCreateBlockNote();
  const isUpdatingRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const initialValueSetRef = useRef(false);

  useEditorChange(
    (editor, ctx) => {
      if (onChange && !isUpdatingRef.current) {
        const markdown = editor.blocksToMarkdownLossy(editor.document);
        onChange(markdown);
      }
    },
    editor
  );

  useEffect(() => {
    if (value && !initialValueSetRef.current) {
      initialValueSetRef.current = true;
      isUpdatingRef.current = true;
      const blocks = editor.tryParseMarkdownToBlocks(value);
      editor.replaceBlocks(editor.document, blocks);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [value, editor]);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !editable) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const clipboardText = e.clipboardData?.getData('text/plain');
      if (!clipboardText) return;

      try {
        const blocks = editor.tryParseMarkdownToBlocks(clipboardText);
        if (blocks.length > 0) {
          e.preventDefault();
          isUpdatingRef.current = true;
          const currentSelection = editor.getSelection();
          const targetBlockId = currentSelection?.blocks[0]?.id || editor.document[editor.document.length - 1]?.id;
          if (targetBlockId) {
            editor.insertBlocks(blocks, targetBlockId, 'after');
          } else {
            editor.replaceBlocks(editor.document, blocks);
          }
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 0);
        }
      } catch (error) {
        console.error('Failed to parse markdown on paste:', error);
      }
    };

    container.addEventListener('paste', handlePaste);
    return () => {
      container.removeEventListener('paste', handlePaste);
    };
  }, [editor, editable]);

  return (
    <div ref={editorContainerRef}>
      <BlockNoteView
        className={cn("max-w-none!", className)}
        editor={editor}
        editable={editable}
        shadCNComponents={shadCNComponents}
      />
    </div>
  );
}