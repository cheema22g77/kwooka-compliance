"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Sparkles } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, isLoading = false, placeholder = "Ask about compliance requirements..." }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative p-4">
      <div className={`absolute inset-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 blur-sm transition-opacity ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
      
      <div className={`relative flex items-end gap-2 p-3 rounded-2xl bg-white border-2 transition-all duration-200 shadow-sm ${isFocused ? 'border-orange-400 shadow-lg shadow-orange-500/10' : 'border-slate-200'}`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] placeholder:text-slate-400 text-slate-700 focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[150px] py-1"
        />

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            input.trim() 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25 hover:shadow-xl' 
              : 'bg-slate-100'
          } disabled:opacity-50`}
        >
          {isLoading ? (
            <Sparkles className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Send className={`h-5 w-5 ${input.trim() ? 'text-white' : 'text-slate-400'}`} />
          )}
        </button>
      </div>

      <p className="text-xs text-center text-slate-400 mt-2">
        Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 border border-slate-200">Enter</kbd> to send
      </p>
    </div>
  );
}
