"use client";

import React from "react";
import { motion } from "framer-motion";
import { SUGGESTED_PROMPTS, QUICK_ACTIONS } from "@/lib/ai/config";
import { AlertTriangle, ClipboardCheck, FileWarning, FileText, Sparkles } from "lucide-react";

interface QuickActionsProps {
  sector: string | null;
  onSelect: (prompt: string) => void;
}

const ICONS: Record<string, React.ReactNode> = {
  'risk-assessment': <AlertTriangle className="h-4 w-4" />,
  'audit-prep': <ClipboardCheck className="h-4 w-4" />,
  'incident-guide': <FileWarning className="h-4 w-4" />,
  'policy-review': <FileText className="h-4 w-4" />,
};

export function QuickActions({ sector, onSelect }: QuickActionsProps) {
  const prompts = SUGGESTED_PROMPTS[(sector as keyof typeof SUGGESTED_PROMPTS) || 'general'] || SUGGESTED_PROMPTS.general;

  return (
    <div className="space-y-6 px-4 py-6">
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-500" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(action.prompt)}
              className="flex items-center gap-2 w-full justify-start h-auto py-3 px-4 text-left rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all text-slate-600 shadow-sm"
            >
              {ICONS[action.id] || <Sparkles className="h-4 w-4" />}
              <span className="text-sm">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-3">Suggested Questions</h3>
        <div className="space-y-2">
          {prompts.map((prompt, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.2 }}
              onClick={() => onSelect(prompt)}
              className="w-full text-left px-4 py-3 rounded-xl text-sm text-slate-600 bg-white hover:bg-orange-50 hover:text-orange-600 border border-slate-200 hover:border-orange-300 transition-all duration-200 shadow-sm"
            >
              {prompt}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
