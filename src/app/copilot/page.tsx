"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage, TypingIndicator } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { QuickActions } from "@/components/chat/quick-actions";
import { SectorSelector } from "@/components/chat/sector-selector";
import { useChatStore } from "@/hooks/use-chat-store";
import { Bot, Shield, Sparkles, MessageSquarePlus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CopilotPage() {
  const { messages, isLoading, currentSector, addMessage, updateMessage, setLoading, setSector, clearMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(async (content: string) => {
    const userMsgId = addMessage({ role: "user", content });
    setLoading(true);

    const conversationHistory = messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sector: currentSector, conversationHistory }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let assistantMessageId: string | null = null;
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "delta") {
                fullContent += data.content;
                if (!assistantMessageId) {
                  assistantMessageId = addMessage({ role: "assistant", content: fullContent });
                } else {
                  updateMessage(assistantMessageId, { content: fullContent });
                }
              } else if (data.type === "done" && assistantMessageId && data.metadata) {
                updateMessage(assistantMessageId, { metadata: data.metadata });
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      addMessage({ role: "assistant", content: "I apologise, but I encountered an error. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [messages, currentSector, addMessage, updateMessage, setLoading]);

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/30 rounded-xl blur-lg" />
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                Compliance Copilot
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-600 border border-orange-200">
                  <Sparkles className="h-2.5 w-2.5" />AI
                </span>
              </h1>
              <p className="text-xs text-slate-500">Kwooka Health Services</p>
            </div>
          </div>
          <button onClick={clearMessages} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-orange-500">
            <MessageSquarePlus className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 pb-3 overflow-x-auto">
          <SectorSelector value={currentSector} onChange={setSector} />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                <div className="relative inline-flex mb-6">
                  <div className="absolute inset-0 bg-orange-500/20 rounded-3xl blur-2xl scale-150" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-xl shadow-orange-500/25">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-3">
                  Compliance <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Copilot</span>
                </h2>
                <p className="text-slate-500 max-w-md mx-auto">Your AI-powered assistant for Australian regulatory compliance.</p>
                <div className="flex items-center justify-center gap-4 mt-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <Shield className="h-3.5 w-3.5" />Australian Focused
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                    <Sparkles className="h-3.5 w-3.5" />Supply Nation
                  </span>
                </div>
              </motion.div>
              <div className="w-full max-w-2xl">
                <QuickActions sector={currentSector} onSelect={handleSend} />
              </div>
            </div>
          ) : (
            <div className="pb-4">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </AnimatePresence>
              {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSend} isLoading={isLoading} placeholder={currentSector ? `Ask about ${currentSector.replace("_", " ")} compliance...` : "Ask about compliance requirements..."} />
        </div>
      </div>
    </div>
  );
}
