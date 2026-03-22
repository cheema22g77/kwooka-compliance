"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChatMessage as ChatMessageType } from "@/hooks/use-chat-store";
import { User, AlertTriangle, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: ChatMessageType;
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 px-4 py-6 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="flex-shrink-0 w-10 h-10 rounded-full object-cover shadow-lg" />
      )}

      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`relative px-5 py-4 text-[15px] leading-relaxed rounded-2xl shadow-sm ${
            isUser
              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-md"
              : "bg-white text-slate-700 rounded-bl-md border border-slate-200"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold text-orange-600 mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold text-orange-500 mt-3 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-700 mt-2 mb-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-orange-600">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-600">{children}</li>,
                  p: ({ children }) => <p className="my-2 text-slate-600">{children}</p>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm text-orange-600 border border-slate-200">{children}</code>
                    ) : (
                      <code className="block bg-slate-50 p-3 rounded-lg text-sm overflow-x-auto border border-slate-200">{children}</code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.metadata && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.metadata.riskLevel && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRiskColor(message.metadata.riskLevel)}`}>
                <AlertTriangle className="h-3 w-3" />
                {message.metadata.riskLevel.charAt(0).toUpperCase() + message.metadata.riskLevel.slice(1)} Risk
              </span>
            )}
            {message.metadata.confidence && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {Math.round(message.metadata.confidence * 100)}% confidence
              </span>
            )}
            {message.metadata.regulationRefs?.map((ref, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                <BookOpen className="h-3 w-3" />
                {ref.section}
              </span>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shadow-lg">
          <User className="h-5 w-5 text-slate-600" />
        </div>
      )}
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 px-4 py-6">
      <img src="/images/kwooka_mascot_clean.png" alt="Kwooka" className="flex-shrink-0 w-10 h-10 rounded-full object-cover shadow-lg" />
      <div className="bg-white rounded-2xl rounded-bl-md border border-slate-200 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </motion.div>
  );
}
