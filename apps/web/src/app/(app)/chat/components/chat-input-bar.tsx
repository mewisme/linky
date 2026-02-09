import { GiphyPicker, useGiphyPicker } from "@/app/(app)/chat/components/giphy";
import { IconMoodSmile, IconPhoto, IconSend, IconX } from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@ws/ui/components/ui/button";
import type { ChatMessageDraft } from "@/types/chat-message.types";
import type { ConnectionStatus } from "@/hooks/webrtc/use-video-chat";
import Image from "next/image";
import { Textarea } from "@ws/ui/components/ui/textarea";
import { cn } from "@ws/ui/lib/utils";
import { compressImageFile } from "@/lib/chat/image-compression";
import { dataUrlByteSize } from "@/lib/chat/blob-utils";
import { maxAttachmentBytes } from "@/lib/chat/attachment-limits";

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

interface AttachmentDraft extends ChatMessageDraft {
  previewUrl?: string | null;
  sizeLabel?: string | null;
}

function getPreviewUrl(draft: AttachmentDraft | null): string | null {
  if (!draft) return null;
  if (draft.previewUrl) return draft.previewUrl;
  if (draft.attachment?.data) return draft.attachment.data;
  return draft.metadata?.url || null;
}

/* -------------------------------------------------- */
/* Main component                                     */
/* -------------------------------------------------- */

export function ChatInputBar({
  connectionStatus,
  onSendMessage,
  onSendTyping,
}: {
  connectionStatus: ConnectionStatus;
  onSendMessage: (draft: ChatMessageDraft) => void;
  onSendTyping: (isTyping: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [attachmentDraft, setAttachmentDraft] =
    useState<AttachmentDraft | null>(null);
  const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

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
    return isInCall && (hasText || !!attachmentDraft);
  }, [text, attachmentDraft, isInCall]);

  /* ---------------- Typing ---------------- */

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

  /* ---------------- Send ---------------- */

  const resetDraft = () => {
    setText("");
    setAttachmentDraft(null);
    setAttachmentError(null);
    giphy.setOpen(false);
  };

  const handleSend = () => {
    if (!canSend) return;

    const messageText = text.trim() || null;

    if (attachmentDraft) {
      onSendMessage({
        type: attachmentDraft.type,
        message: messageText,
        attachment: attachmentDraft.attachment || null,
        metadata: attachmentDraft.metadata || null,
      });
    } else if (messageText) {
      onSendMessage({
        type: "text",
        message: messageText,
        attachment: null,
        metadata: null,
      });
    }

    resetDraft();
  };

  /* ---------------- Image ---------------- */

  const handleImagePick = async (file: File) => {
    if (!isInCall) return;

    setAttachmentError(null);
    setIsPreparingAttachment(true);

    try {
      const result = await compressImageFile(file);
      const encodedSize = dataUrlByteSize(result.dataUrl);

      if (encodedSize > maxAttachmentBytes) {
        setAttachmentError("Image exceeds 5MB after compression.");
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
        error instanceof Error
          ? error.message
          : "Failed to prepare image."
      );
    } finally {
      setIsPreparingAttachment(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await handleImagePick(file);
  };

  const previewUrl = getPreviewUrl(attachmentDraft);

  /* ---------------- Render ---------------- */

  return (
    <div className="border-t bg-background/80 backdrop-blur px-2 py-2 pb-safe">
      {/* Attachment preview */}
      {attachmentDraft && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border bg-background p-2">
          <div className="flex-1 overflow-hidden">
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Preview"
                width={240}
                height={180}
                className="max-h-32 w-auto rounded-lg object-contain"
                unoptimized
              />
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setAttachmentDraft(null)}
          >
            <IconX size={18} />
          </Button>
        </div>
      )}

      {attachmentError && (
        <p className="mb-2 text-xs text-destructive">
          {attachmentError}
        </p>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <Button
          size="icon"
          variant="ghost"
          disabled={!isInCall}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full"
        >
          <IconPhoto size={20} />
        </Button>

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
