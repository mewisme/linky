import type { ChatMessage } from "@/types/chat-message.types";
import Image from "next/image";
import { cn } from "@repo/ui/lib/utils";

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

  return (
    <div
      className={cn(
        message.type === "text" && "px-4 py-2 text-base shadow-sm max-w-full",
        "whitespace-pre-wrap break-all",
        className
      )}
    >
      {message.type === "text" && message.message}
      {message.type === "image" && attachmentUrl && (
        <Image
          src={attachmentUrl}
          alt="Chat attachment"
          width={attachment?.width || 320}
          height={attachment?.height || 240}
          className="max-h-64 w-auto rounded-lg"
          unoptimized
        />
      )}
      {(message.type === "gif" || message.type === "sticker") && attachmentUrl && (
        <Image
          src={attachmentUrl}
          alt="Chat media"
          width={attachment?.width || 320}
          height={attachment?.height || 240}
          className="max-h-64 w-auto rounded-lg"
          unoptimized
        />
      )}
      {message.type !== "text" && message.message && (
        <p className="mt-2">{message.message}</p>
      )}
    </div>
  );
}
