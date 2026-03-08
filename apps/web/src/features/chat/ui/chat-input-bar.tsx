import { GiphyPicker, useGiphyPicker } from "./giphy";
import {
  IconMoodSmile,
  IconMusic,
  IconPaperclip,
  IconPhoto,
  IconSend,
  IconVideo,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ws/ui/components/ui/dropdown-menu";
import { Button } from "@ws/ui/components/ui/button";
import type { ChatMessageDraft } from "@/features/chat/types/chat-message.types";
import type { ConnectionStatus } from "@/features/call/hooks/webrtc/use-video-chat";
import { Textarea } from "@ws/ui/components/ui/textarea";
import { cn } from "@ws/ui/lib/utils";
import { compressImageFile } from "@/features/chat/lib/image-compression";
import { dataUrlByteSize } from "@/features/chat/lib/blob-utils";
import { maxAttachmentBytes } from "@/features/chat/lib/attachment-limits";

type AttachmentPickType = "image" | "video" | "audio";

export function ChatInputBar({
  connectionStatus,
  onSendMessage,
  onSendTyping,
}: {
  connectionStatus: ConnectionStatus;
  onSendMessage: (draft: ChatMessageDraft, file?: File | null) => void;
  onSendTyping: (isTyping: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingAttachmentTypeRef = useRef<AttachmentPickType | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, []);

  const isInCall =
    connectionStatus === "in_call" ||
    connectionStatus === "reconnecting";

  const giphy = useGiphyPicker({
    onSelect: ({ item, type: msgType }) => {
      if (!isInCall) return;
      onSendMessage({
        type: msgType,
        message: null,
        attachment: null,
        metadata: {
          source: "giphy",
          gifId: msgType === "gif" ? item.id : undefined,
          stickerId: msgType === "sticker" ? item.id : undefined,
          url: item.url,
        },
      });
    },
  });

  const canSend = useMemo(() => {
    const hasText = text.trim().length > 0;
    return isInCall && hasText;
  }, [text, isInCall]);

  const handleTypingChange = (value: string) => {
    setText(value);
    if (!isInCall) return;

    onSendTyping(true);
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = window.setTimeout(() => {
      onSendTyping(false);
      typingTimerRef.current = null;
    }, 1200);
  };

  const resetDraft = () => {
    setText("");
    setAttachmentError(null);
    giphy.setOpen(false);
  };

  const handleSend = () => {
    if (!canSend) return;
    const messageText = text.trim() || null;
    if (messageText) {
      onSendMessage({
        type: "text",
        message: messageText,
        attachment: null,
        metadata: null,
      });
    }
    resetDraft();
  };

  const triggerFileInput = (type: AttachmentPickType) => {
    if (!fileInputRef.current) return;
    pendingAttachmentTypeRef.current = type;
    if (type === "image") {
      fileInputRef.current.accept = "image/*";
    } else if (type === "video") {
      fileInputRef.current.accept = "video/*";
    } else {
      fileInputRef.current.accept = "audio/*";
    }
    fileInputRef.current.click();
  };

  const handleImagePick = async (file: File) => {
    if (!isInCall) return;
    setAttachmentError(null);
    setIsPreparingAttachment(true);
    try {
      const result = await compressImageFile(file);
      const encodedSize = dataUrlByteSize(result.dataUrl);
      if (encodedSize > maxAttachmentBytes) {
        setAttachmentError("Image exceeds size limit after compression.");
        return;
      }
      onSendMessage({
        type: "image",
        message: null,
        attachment: {
          mimeType: result.mimeType,
          size: encodedSize,
          width: result.width,
          height: result.height,
          data: result.dataUrl,
          preview: result.dataUrl,
        },
        metadata: { compressRatio: result.compressRatio },
      });
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : "Failed to prepare image."
      );
    } finally {
      setIsPreparingAttachment(false);
    }
  };

  const handleMediaPick = (file: File, type: "video" | "audio") => {
    if (!isInCall || file.size > maxAttachmentBytes) {
      if (file.size > maxAttachmentBytes) {
        setAttachmentError("File exceeds size limit.");
      }
      return;
    }
    setAttachmentError(null);
    onSendMessage(
      {
        type,
        message: null,
        attachment: {
          mimeType: file.type || (type === "video" ? "video/mp4" : "audio/mpeg"),
          size: file.size,
        },
        metadata: null,
      },
      file
    );
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const type = pendingAttachmentTypeRef.current;
    pendingAttachmentTypeRef.current = null;
    if (!file || !type) return;
    if (type === "image") {
      await handleImagePick(file);
    } else if (type === "video") {
      handleMediaPick(file, "video");
    } else {
      handleMediaPick(file, "audio");
    }
  };

  return (
    <div className="border-t bg-background/80 backdrop-blur px-2 py-2 pb-safe">
      {attachmentError && (
        <p className="mb-2 text-xs text-destructive">{attachmentError}</p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled={!isInCall}
              className="rounded-full"
            >
              <IconPaperclip size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="mb-2">
            <DropdownMenuItem
              onClick={() => triggerFileInput("image")}
              disabled={!isInCall}
            >
              <IconPhoto size={18} />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => triggerFileInput("video")}
              disabled={!isInCall}
            >
              <IconVideo size={18} />
              Video
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => triggerFileInput("audio")}
              disabled={!isInCall}
            >
              <IconMusic size={18} />
              Audio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <GiphyPicker
          open={giphy.open}
          onOpenChange={giphy.setOpen}
          query={giphy.query}
          onQueryChange={giphy.setQuery}
          type={giphy.type}
          onTypeChange={giphy.setType}
          loading={giphy.loading}
          results={giphy.results}
          onSelect={giphy.onSelect}
          disabled={!isInCall}
        >
          <IconMoodSmile size={20} />
        </GiphyPicker>

        <Textarea
          value={text}
          onChange={(e) => handleTypingChange(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isComposing) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={!isInCall}
          placeholder="Type a message..."
          className={cn(
            "no-ios-zoom flex-1 resize-none rounded-2xl border px-4 py-2 text-base",
            "min-h-[40px] max-h-40",
            "focus-visible:ring-1 focus-visible:ring-primary/30"
          )}
        />

        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend || isPreparingAttachment}
          className="rounded-full"
        >
          <IconSend size={18} />
        </Button>
      </div>
    </div>
  );
}
