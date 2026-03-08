import { GiphyPicker, useGiphyPicker } from "./giphy";
import { IconArrowUp, IconMoodSmile, IconPhoto } from "@tabler/icons-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "@ws/ui/components/ui/input-group";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessageDraft } from "@/features/chat/types/chat-message.types";
import type { ConnectionStatus } from "@/features/call/hooks/webrtc/use-video-chat";
import { compressImageFile } from "@/features/chat/lib/image-compression";
import { dataUrlByteSize } from "@/features/chat/lib/blob-utils";
import { maxAttachmentBytes } from "@/features/chat/lib/attachment-limits";
import { toast } from "@ws/ui/components/ui/sonner";

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
    useState<ChatMessageDraft | null>(null);
  const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

    setIsPreparingAttachment(true);

    try {
      const result = await compressImageFile(file);
      const encodedSize = dataUrlByteSize(result.dataUrl);

      if (encodedSize > maxAttachmentBytes) {
        toast.error("Image exceeds 5MB after compression.");
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
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to prepare image for sending."
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

  /* ---------------- Render ---------------- */

  return (
    <div className="bg-background/80 backdrop-blur px-2 py-2 pb-safe">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <InputGroup>
        <InputGroupTextarea
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
          placeholder="Type a message..." />
        <InputGroupAddon align="block-end">
          <InputGroupButton
            variant={'ghost'}
            className="rounded-full"
            size="icon-sm"
            aria-label="Send image"
            disabled={!isInCall}
            onClick={() => fileInputRef.current?.click()}
          >
            <IconPhoto />
          </InputGroupButton>

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
            <InputGroupButton
              variant={'ghost'}
              className="rounded-full"
              size="icon-sm"
              aria-label="Send GIF"
            >
              <IconMoodSmile />
            </InputGroupButton>
          </GiphyPicker>
          <InputGroupButton
            variant="default"
            className="rounded-full ml-auto"
            onClick={handleSend}
            disabled={!canSend || isPreparingAttachment}
            size="icon-xs"
          >
            <IconArrowUp />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
