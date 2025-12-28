// Socket.IO event types
export interface MessageData {
  text: string;
  userId?: string;
  timestamp?: string;
}

export interface RoomData {
  room: string;
  socketId: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

// Export webhook types
export * from "./webhook.js";

