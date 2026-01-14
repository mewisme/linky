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

  useEditorChange(
    (editor, ctx) => {
      const changes = ctx.getChanges();
      console.log(changes);

      // Convert blocks to markdown and call onChange
      if (onChange && !isUpdatingRef.current) {
        const markdown = editor.blocksToMarkdownLossy(editor.document);
        onChange(markdown);
      }
    },
    editor
  );

  useEffect(() => {
    if (value) {
      isUpdatingRef.current = true;
      const blocks = editor.tryParseMarkdownToBlocks(value);
      editor.replaceBlocks(editor.document, blocks);
      // Reset flag after a short delay to allow the change handler to process
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [value, editor]);

  return (
    <>
      <BlockNoteView
        className={cn("max-w-none!", className)}
        editor={editor}
        editable={editable}
        shadCNComponents={shadCNComponents}
      />
    </>
  );
}