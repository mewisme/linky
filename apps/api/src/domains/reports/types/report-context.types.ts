import type { Json } from "@/types/database/supabase.types.js";
import type { Namespace } from "socket.io";

export interface CollectReportContextParams {
  reporterUserId: string;
  reportedUserId: string;
  callId?: string;
  roomId?: string;
  behaviorFlags?: {
    call_metadata?: {
      reporter_muted?: boolean;
      reported_muted?: boolean;
      reporter_video_off?: boolean;
      reported_video_off?: boolean;
      call_ended_by?: "reporter" | "reported" | "system";
      end_type?: "end-call" | "skip" | "disconnect";
    };
    reporter_flags?: string[];
  };
}

export interface ReportContextData {
  call_id: string | null;
  room_id: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  duration_seconds: number | null;
  reporter_role: string | null;
  reported_role: string | null;
  ended_by: string | null;
  reported_at_offset_seconds: number | null;
  chat_snapshot: Json | null;
  behavior_flags: Json | null;
}

export interface LiveVideoChatRooms {
  getRoom(roomId: string): { user1: string; user2: string; startedAt: Date } | undefined;
}

export interface LiveVideoChatContext {
  io: Namespace;
  rooms: LiveVideoChatRooms;
}

