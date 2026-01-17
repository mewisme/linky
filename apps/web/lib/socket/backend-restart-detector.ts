import type { Socket } from "socket.io-client";

const BACKEND_RESTART_DISCONNECT_REASONS = [
  "transport close",
  "ping timeout",
  "server namespace disconnect",
  "forced close",
];

const USER_INITIATED_DISCONNECT_REASONS = [
  "io client disconnect",
  "io server disconnect",
];

export class BackendRestartDetector {
  private previousSocketId: string | null = null;
  private lastDisconnectReason: string | null = null;
  private wasConnectedBeforeDisconnect = false;

  recordDisconnect(reason: string, wasConnected: boolean): void {
    this.lastDisconnectReason = reason;
    this.wasConnectedBeforeDisconnect = wasConnected;
  }

  recordConnect(socket: Socket): boolean {
    const currentSocketId = socket.id || null;
    const isBackendRestart = this.detectBackendRestart(currentSocketId);
    this.previousSocketId = currentSocketId;
    this.lastDisconnectReason = null;
    this.wasConnectedBeforeDisconnect = false;
    return isBackendRestart;
  }

  private detectBackendRestart(currentSocketId: string | null): boolean {
    if (!currentSocketId) {
      return false;
    }

    if (!this.wasConnectedBeforeDisconnect) {
      return false;
    }

    if (!this.lastDisconnectReason) {
      return false;
    }

    if (USER_INITIATED_DISCONNECT_REASONS.includes(this.lastDisconnectReason)) {
      return false;
    }

    if (BACKEND_RESTART_DISCONNECT_REASONS.includes(this.lastDisconnectReason)) {
      return true;
    }

    if (this.previousSocketId && this.previousSocketId !== currentSocketId) {
      return true;
    }

    return false;
  }

  reset(): void {
    this.previousSocketId = null;
    this.lastDisconnectReason = null;
    this.wasConnectedBeforeDisconnect = false;
  }
}

export const backendRestartDetector = new BackendRestartDetector();
