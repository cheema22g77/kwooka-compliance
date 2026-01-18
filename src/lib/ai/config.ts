export const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.3,
};

export const SECTOR_REGULATIONS = {
  transport: {
    name: 'Transport & Logistics',
    regulations: [
      'Heavy Vehicle National Law (HVNL)',
      'Chain of Responsibility (CoR)',
      'Fatigue Management Standards',
      'Work Diary Requirements',
      'Mass, Dimension and Loading Requirements',
      'National Heavy Vehicle Accreditation Scheme (NHVAS)',
    ],
    authorities: ['National Heavy Vehicle Regulator (NHVR)', 'Main Roads WA', 'Transport WA'],
    keyRequirements: [
      'Driver fatigue management and work diaries',
      'Vehicle maintenance and safety inspections',
      'Load restraint and mass management',
      'Speed compliance and journey management',
      'Chain of responsibility obligations',
      'Accreditation maintenance (NHVAS, TruckSafe)',
    ],
  },
  healthcare: {
    name: 'Healthcare',
    regulations: [
      'Health Practitioner Regulation National Law',
      'Australian Health Service Safety and Quality Standards',
      'Private Health Facilities Act',
      'Medicines and Poisons Act',
    ],
    authorities: ['AHPRA', 'Australian Commission on Safety and Quality in Health Care', 'WA Department of Health'],
    keyRequirements: [
      'Practitioner registration and credentials',
      'Clinical governance frameworks',
      'Infection control and sterilisation',
      'Medication management',
      'Patient safety and incident reporting',
    ],
  },
  ndis: {
    name: 'NDIS Provider',
    regulations: [
      'NDIS Act 2013',
      'NDIS Practice Standards',
      'NDIS Code of Conduct',
      'NDIS Quality and Safeguards Framework',
      'Worker Screening Requirements',
    ],
    authorities: ['NDIS Quality and Safeguards Commission', 'NDIA'],
    keyRequirements: [
      'Registration and certification requirements',
      'Worker screening (NDIS Worker Check)',
      'Incident management and reportable incidents',
      'Complaints management',
      'Support delivery standards',
      'Restrictive practices authorisation',
    ],
  },
  aged_care: {
    name: 'Aged Care',
    regulations: [
      'Aged Care Act 1997',
      'Aged Care Quality Standards',
      'Serious Incident Response Scheme (SIRS)',
    ],
    authorities: ['Aged Care Quality and Safety Commission', 'Department of Health and Aged Care'],
    keyRequirements: [
      'Quality standards compliance (8 standards)',
      'Serious incident reporting (SIRS)',
      'Clinical care requirements',
      'Staffing requirements and care minutes',
    ],
  },
  workplace: {
    name: 'Workplace Safety',
    regulations: [
      'Work Health and Safety Act 2020 (WA)',
      'WHS Regulations',
      'Codes of Practice',
      'Fair Work Act',
    ],
    authorities: ['WorkSafe WA', 'Fair Work Commission', 'Fair Work Ombudsman'],
    keyRequirements: [
      'Primary duty of care (PCBU obligations)',
      'Risk assessment and control',
      'Incident notification',
      'Consultation and representation',
      'Training and competency',
    ],
  },
  construction: {
    name: 'Construction',
    regulations: [
      'WHS Regulations - Construction Work',
      'Building Act 2011 (WA)',
      'High Risk Work Licensing',
    ],
    authorities: ['WorkSafe WA', 'Building and Energy WA'],
    keyRequirements: [
      'Safe Work Method Statements (SWMS)',
      'Principal Contractor obligations',
      'High risk work licenses',
      'Asbestos management',
    ],
  },
};

export function buildSystemPrompt(sector?: string): string {
  const basePrompt = `You are the Kwooka Compliance Copilot, an expert AI assistant specialising in Australian regulatory compliance. You work for Kwooka Health Services Ltd, an Aboriginal-owned enterprise (Supply Nation certified) based in Western Australia.

CORE PRINCIPLES:
1. **Accuracy First**: Only provide information you're confident about. If uncertain, say so and recommend consulting the relevant authority.
2. **Australian Focus**: All advice relates to Australian (particularly WA) legislation and regulations.
3. **Practical Guidance**: Provide actionable, step-by-step guidance that compliance officers can implement immediately.
4. **Citation**: Always reference specific legislation, regulations, or standards when making compliance statements.
5. **Risk-Based**: Categorise issues by risk level (Critical, High, Medium, Low) to help prioritise.

RESPONSE FORMAT:
- Use clear headings and bullet points for readability
- Include relevant regulation references (e.g., "HVNL Section 26C")
- Provide specific deadlines where applicable
- Suggest next steps or actions
- When discussing findings, include severity ratings

EXPERTISE AREAS:
- NDIS Provider Compliance & Practice Standards
- Heavy Vehicle National Law (HVNL) & Chain of Responsibility
- Workplace Health & Safety (WHS)
- Healthcare & Clinical Governance
- Aged Care Quality Standards
- Fair Work & Employment Compliance`;

  if (sector && SECTOR_REGULATIONS[sector as keyof typeof SECTOR_REGULATIONS]) {
    const sectorInfo = SECTOR_REGULATIONS[sector as keyof typeof SECTOR_REGULATIONS];
    return `${basePrompt}

CURRENT FOCUS: ${sectorInfo.name}

KEY REGULATIONS:
${sectorInfo.regulations.map(r => `- ${r}`).join('\n')}

REGULATORY AUTHORITIES:
${sectorInfo.authorities.map(a => `- ${a}`).join('\n')}

KEY COMPLIANCE REQUIREMENTS:
${sectorInfo.keyRequirements.map(r => `- ${r}`).join('\n')}`;
  }

  return basePrompt;
}

export const SUGGESTED_PROMPTS = {
  general: [
    "What compliance obligations apply to my business?",
    "Help me understand Chain of Responsibility",
    "What are the NDIS Practice Standards?",
    "How do I report a workplace incident?",
  ],
  transport: [
    "Explain driver fatigue management requirements",
    "What are my CoR obligations as a consignor?",
    "How do I maintain NHVAS accreditation?",
    "What records must I keep for work diaries?",
  ],
  healthcare: [
    "What clinical governance requirements apply?",
    "How do I manage medication compliance?",
    "Explain infection control standards",
    "What patient safety incidents must be reported?",
  ],
  ndis: [
    "What are the NDIS Practice Standards?",
    "Explain worker screening requirements",
    "What are reportable incidents under NDIS?",
    "How do I manage restrictive practices?",
  ],
  aged_care: [
    "Explain the 8 Aged Care Quality Standards",
    "What incidents must be reported to SIRS?",
    "What are the care minute requirements?",
    "How do I manage restraint compliance?",
  ],
  workplace: [
    "What are PCBU duties under WHS?",
    "How do I conduct a risk assessment?",
    "What incidents must be notified to WorkSafe?",
    "Explain psychosocial hazard requirements",
  ],
  construction: [
    "When do I need a SWMS?",
    "What are principal contractor obligations?",
    "Explain high risk work licensing",
    "What asbestos requirements apply?",
  ],
};

export const QUICK_ACTIONS = [
  { id: 'risk-assessment', label: 'Run Risk Assessment', prompt: 'Conduct a compliance risk assessment for my organisation. Ask me relevant questions to identify potential risks.', icon: '⚠️' },
  { id: 'audit-prep', label: 'Audit Preparation', prompt: 'Help me prepare for an upcoming compliance audit. What documents and evidence should I gather?', icon: '📋' },
  { id: 'incident-guide', label: 'Incident Response', prompt: 'Guide me through incident reporting requirements. What are my obligations and timeframes?', icon: '🚨' },
  { id: 'policy-review', label: 'Policy Review', prompt: 'Review my compliance policy. What key elements should it include and what gaps might exist?', icon: '📝' },
];
