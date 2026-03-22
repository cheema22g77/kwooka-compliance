/**
 * AI Configuration
 * 
 * MIGRATED: Sector config now imported from core/value-objects/sectors.ts
 * This file re-exports for backward compatibility with existing components.
 */

import { SECTORS, type SectorId } from '@/core/value-objects/sectors';

export const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.3,
};

// Re-export SECTORS for backward compatibility with components that import from here
export const SECTOR_REGULATIONS = Object.fromEntries(
  Object.entries(SECTORS).map(([key, s]) => [
    key,
    {
      name: s.fullName,
      regulations: s.regulations,
      authorities: s.authorities,
      keyRequirements: s.keyAreas,
    },
  ])
);

// Re-export buildSystemPrompt for any remaining consumers
export function buildSystemPrompt(sector?: string): string {
  const basePrompt = `You are the Kwooka Compliance Copilot, an expert AI assistant specialising in Australian regulatory compliance. You work for Kwooka Health Services Ltd, an Aboriginal-owned enterprise (Supply Nation certified) based in Western Australia.

CORE PRINCIPLES:
1. Accuracy First: Only provide information you're confident about.
2. Australian Focus: All advice relates to Australian (particularly WA) legislation.
3. Practical Guidance: Provide actionable, step-by-step guidance.
4. Citation: Always reference specific legislation when making compliance statements.
5. Risk-Based: Categorise issues by risk level (Critical, High, Medium, Low).`;

  if (sector && SECTORS[sector as SectorId]) {
    const s = SECTORS[sector as SectorId];
    return `${basePrompt}

CURRENT FOCUS: ${s.fullName}

KEY REGULATIONS:
${s.regulations.map(r => `- ${r}`).join('\n')}

REGULATORY AUTHORITIES:
${s.authorities.map(a => `- ${a}`).join('\n')}

KEY COMPLIANCE AREAS:
${s.keyAreas.map(a => `- ${a}`).join('\n')}`;
  }

  return basePrompt;
}

// Re-export prompts — now derived from single sector source
export const SUGGESTED_PROMPTS: Record<string, string[]> = {
  general: [
    'What compliance obligations apply to my business?',
    'Help me understand Chain of Responsibility',
    'What are the NDIS Practice Standards?',
    'How do I report a workplace incident?',
  ],
  ...Object.fromEntries(
    Object.entries(SECTORS).map(([key, s]) => [key, s.suggestedPrompts])
  ),
};

export const QUICK_ACTIONS = [
  { id: 'risk-assessment', label: 'Run Risk Assessment', prompt: 'Conduct a compliance risk assessment for my organisation. Ask me relevant questions to identify potential risks.', icon: '⚠️' },
  { id: 'audit-prep', label: 'Audit Preparation', prompt: 'Help me prepare for an upcoming compliance audit. What documents and evidence should I gather?', icon: '📋' },
  { id: 'incident-guide', label: 'Incident Response', prompt: 'Guide me through incident reporting requirements. What are my obligations and timeframes?', icon: '🚨' },
  { id: 'policy-review', label: 'Policy Review', prompt: 'Review my compliance policy. What key elements should it include and what gaps might exist?', icon: '📝' },
];
