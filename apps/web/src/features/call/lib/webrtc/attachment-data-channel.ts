export const ATTACHMENT_CHANNEL_LABEL = "chat-attachment";
export const CHUNK_SIZE = 16384;
const BUFFER_LOW_THRESHOLD = 16384;
const BUFFER_WAIT_HIGH = 65536;

export interface AttachmentMeta {
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface AttachmentMetaMessage {
  type: "meta";
  messageId: string;
  attachment: AttachmentMeta;
}

export interface FileEndMessage {
  type: "file-end";
  messageId: string;
}

export interface AllDoneMessage {
  type: "all-done";
}

export type AttachmentControlMessage = AttachmentMetaMessage | FileEndMessage | AllDoneMessage;

export function isAttachmentControlMessage(msg: unknown): msg is AttachmentControlMessage {
  if (typeof msg !== "object" || msg === null) return false;
  const t = (msg as { type?: string }).type;
  return t === "meta" || t === "file-end" || t === "all-done";
}

export function createAttachmentPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 4,
  });
}

export function createSenderConnection(iceServers: RTCIceServer[]): {
  pc: RTCPeerConnection;
  dataChannelPromise: Promise<RTCDataChannel>;
} {
  const pc = createAttachmentPeerConnection(iceServers);
  const dc = pc.createDataChannel(ATTACHMENT_CHANNEL_LABEL, { ordered: true });
  dc.binaryType = "arraybuffer";
  const dataChannelPromise = new Promise<RTCDataChannel>((resolve, reject) => {
    dc.onopen = () => resolve(dc);
    dc.onerror = () => reject(new Error("Attachment data channel error"));
  });
  return { pc, dataChannelPromise };
}

export function createReceiverConnection(iceServers: RTCIceServer[]): {
  pc: RTCPeerConnection;
  setOnDataChannel: (callback: (dc: RTCDataChannel) => void) => void;
} {
  const pc = createAttachmentPeerConnection(iceServers);
  let onChannel: ((dc: RTCDataChannel) => void) | null = null;
  pc.ondatachannel = (ev) => {
    const dc = ev.channel;
    if (dc.label === ATTACHMENT_CHANNEL_LABEL) {
      dc.binaryType = "arraybuffer";
      onChannel?.(dc);
    }
  };
  return {
    pc,
    setOnDataChannel: (cb) => {
      onChannel = cb;
    },
  };
}

export async function sendFileOverDataChannel(
  dc: RTCDataChannel,
  messageId: string,
  attachmentMeta: AttachmentMeta,
  blob: Blob
): Promise<void> {
  if (dc.readyState !== "open") {
    throw new Error("Data channel not open");
  }

  dc.send(JSON.stringify({ type: "meta", messageId, attachment: attachmentMeta } as AttachmentMetaMessage));

  const buffer = await blob.arrayBuffer();
  let offset = 0;

  while (offset < buffer.byteLength) {
    if (dc.bufferedAmount > BUFFER_WAIT_HIGH) {
      await new Promise<void>((resolve) => {
        dc.bufferedAmountLowThreshold = BUFFER_LOW_THRESHOLD;
        dc.onbufferedamountlow = () => {
          dc.onbufferedamountlow = null;
          resolve();
        };
      });
    }
    const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength);
    dc.send(buffer.slice(offset, end));
    offset = end;
  }

  dc.send(JSON.stringify({ type: "file-end", messageId } as FileEndMessage));
  dc.send(JSON.stringify({ type: "all-done" } as AllDoneMessage));
}

export interface AttachmentReceivedPayload {
  messageId: string;
  attachment: AttachmentMeta;
  blob: Blob;
}

export function setupAttachmentReceiverHandlers(
  dc: RTCDataChannel,
  onReceived: (payload: AttachmentReceivedPayload) => void
): void {
  let currentMessageId: string | null = null;
  let currentMeta: AttachmentReceivedPayload["attachment"] | null = null;
  const chunks: ArrayBuffer[] = [];

  dc.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
    if (typeof event.data === "string") {
      try {
        const parsed = JSON.parse(event.data) as AttachmentControlMessage;
        if (parsed.type === "meta") {
          currentMessageId = parsed.messageId;
          currentMeta = parsed.attachment;
          chunks.length = 0;
        } else if (parsed.type === "file-end" && currentMessageId && currentMeta) {
          const blob = new Blob(chunks, { type: currentMeta.mimeType });
          onReceived({ messageId: currentMessageId, attachment: currentMeta, blob });
          currentMessageId = null;
          currentMeta = null;
          chunks.length = 0;
        }
      } catch {
        // ignore non-JSON
      }
      return;
    }
    chunks.push(event.data as ArrayBuffer);
  };
}
