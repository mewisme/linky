export const VIDEO_CHAT_NO_MICROPHONE_ERROR_MESSAGE =
  "No microphone found. Please connect a microphone to start a call." as const;

export function isVideoChatNoMicrophoneError(message: string | null | undefined): boolean {
  return message === VIDEO_CHAT_NO_MICROPHONE_ERROR_MESSAGE;
}
