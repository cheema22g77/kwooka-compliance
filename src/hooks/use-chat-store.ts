import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    riskLevel?: string;
    regulationRefs?: Array<{ id: string; name: string; section: string }>;
    confidence?: number;
  };
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentSector: string | null;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setLoading: (loading: boolean) => void;
  setSector: (sector: string | null) => void;
  clearMessages: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  currentSector: null,

  addMessage: (message) => {
    const id = generateId();
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setSector: (sector) => set({ currentSector: sector }),
  clearMessages: () => set({ messages: [] }),
}));
