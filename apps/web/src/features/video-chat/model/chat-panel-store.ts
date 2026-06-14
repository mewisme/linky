import { create } from "zustand";

interface ChatPanelState {
  isChatPanelOpen: boolean;
  openChatPanel: () => void;
  closeChatPanel: () => void;
  toggleChatPanel: () => void;
  setChatPanelOpen: (open: boolean) => void;
}

export const useChatPanelStore = create<ChatPanelState>((set) => ({
  isChatPanelOpen: false,
  openChatPanel: () => set({ isChatPanelOpen: true }),
  closeChatPanel: () => set({ isChatPanelOpen: false }),
  toggleChatPanel: () => set((s) => ({ isChatPanelOpen: !s.isChatPanelOpen })),
  setChatPanelOpen: (open) => set({ isChatPanelOpen: open }),
}));

