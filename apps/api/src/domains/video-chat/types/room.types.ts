export interface VideoChatRoom {
  user1: string;
  user2: string;
  startedAt: Date;
}

export interface VideoChatRoomRecord extends VideoChatRoom {
  id: string;
  createdAt: Date;
}

