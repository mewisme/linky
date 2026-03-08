import type { ChatMessage } from "@/features/chat/types/chat-message.types";
import Image from "next/image";
import { ImageZoom } from "@ws/ui/components/kibo-ui/image-zoom";
import { cn } from "@ws/ui/lib/utils";

export function ChatMessageBubble({
  message,
  className,
}: {
  message: ChatMessage;
  className?: string;
}) {
  if (message.type === "system") {
    return (
      <div className="w-full text-center text-sm text-muted-foreground">
        {message.message}
      </div>
    );
  }

  const attachment = message.attachment;
  const attachmentUrl = attachment?.data || message.metadata?.url || "";
  const isPendingWebRtcAttachment =
    (message.type === "image" || message.type === "video" || message.type === "audio") &&
    attachment &&
    !attachmentUrl;

  return (
    <div
      className={cn(
        message.type === "text" && "px-4 py-2 text-base shadow-sm max-w-full",
        "whitespace-pre-wrap break-all",
        className
      )}
    >
      {message.type === "text" && message.message}
      {message.type === "image" && isPendingWebRtcAttachment && (
        <div className="flex max-h-64 min-h-24 items-center justify-center rounded-lg border border-dashed bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
          Receiving...
        </div>
      )}
      {message.type === "image" && attachmentUrl && (
        <ImageZoom>
          <Image
            src={attachmentUrl}
            alt="Chat attachment"
            width={attachment?.width || 320}
            height={attachment?.height || 240}
            className="max-h-64 w-auto rounded-lg"
            unoptimized
          />
        </ImageZoom>
      )}
      {message.type === "video" && isPendingWebRtcAttachment && (
        <div className="flex max-h-64 min-h-24 items-center justify-center rounded-lg border border-dashed bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
          Receiving...
        </div>
      )}
      {message.type === "video" && attachmentUrl && (
        <video
          src={attachmentUrl}
          controls
          className="max-h-64 w-auto rounded-lg"
          preload="metadata"
        />
      )}
      {message.type === "audio" && isPendingWebRtcAttachment && (
        <div className="flex max-h-16 min-h-12 items-center justify-center rounded-lg border border-dashed bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Receiving...
        </div>
      )}
      {message.type === "audio" && attachmentUrl && (
        <audio src={attachmentUrl} controls className="max-w-full" />
      )}
      {(message.type === "gif" || message.type === "sticker") && attachmentUrl && (
        <ImageZoom>
          <Image
            src={attachmentUrl}
            alt="Chat media"
            width={attachment?.width || 320}
            height={attachment?.height || 240}
            className="max-h-64 w-auto rounded-lg"
            unoptimized
          />
        </ImageZoom>
      )}
      {message.type !== "text" && message.message && (
        <p className="mt-2">{message.message}</p>
      )}
    </div>
  );
}
