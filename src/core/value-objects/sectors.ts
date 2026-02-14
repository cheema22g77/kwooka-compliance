/**
 * Ring 1: Sector Configuration — SINGLE SOURCE OF TRUTH
 * 
 * Replaces:
 *   - src/app/api/analyze/route.ts SECTOR_CONFIG (lines 5-50)
 *   - src/lib/ai/config.ts SECTOR_REGULATIONS (lines 5-90)
 *   - src/contexts/sector-context.tsx sector definitions
 */

export type SectorId = 'ndis' | 'aged_care' | 'healthcare' | 'transport' | 'workplace' | 'construction';

export interface SectorConfig {
  id: SectorId;
  name: string;
  fullName: string;
  authority: string;
  icon: string;
  color: string;
  keyAreas: string[];
  regulations: string[];
  authorities: string[];
  suggestedPrompts: string[];
}

export const SECTORS: Record<SectorId, SectorConfig> = {
  ndis: {
    id: 'ndis',
    name: 'NDIS',
    fullName: 'NDIS Practice Standards',
    authority: 'NDIS Quality and Safeguards Commission',
    icon: 'Shield',
    color: 'orange',
    keyAreas: [
      'Rights and Responsibilities',
      'Governance and Operational Management',
      'Provision of Supports',
      'Support Provision Environment',
      'Worker Screening',
      'Incident Management',
      'Complaints Management',
      'Restrictive Practices',
    ],
    regulations: [
      'NDIS Act 2013',
      'NDIS Practice Standards',
      'NDIS Code of Conduct',
      'NDIS Quality and Safeguards Framework',
      'Worker Screening Requirements',
    ],
    authorities: ['NDIS Quality and Safeguards Commission', 'NDIA'],
    suggestedPrompts: [
      'What are the NDIS Practice Standards?',
      'Explain worker screening requirements',
      'What are reportable incidents under NDIS?',
      'How do I manage restrictive practices?',
    ],
  },
  transport: {
    id: 'transport',
    name: 'Transport',
    fullName: 'Heavy Vehicle National Law (HVNL)',
    authority: 'National Heavy Vehicle Regulator (NHVR)',
    icon: 'Truck',
    color: 'blue',
    keyAreas: [
      'Chain of Responsibility',
      'Fatigue Management',
      'Speed Compliance',
      'Mass & Loading',
      'Vehicle Standards',
      'Driver Competency',
      'Journey Management',
      'Record Keeping',
    ],
    regulations: [
      'Heavy Vehicle National Law (HVNL)',
      'Chain of Responsibility (CoR)',
      'Fatigue Management Standards',
      'Work Diary Requirements',
      'Mass, Dimension and Loading Requirements',
      'National Heavy Vehicle Accreditation Scheme (NHVAS)',
    ],
    authorities: ['National Heavy Vehicle Regulator (NHVR)', 'Main Roads WA', 'Transport WA'],
    suggestedPrompts: [
      'Explain driver fatigue management requirements',
      'What are my CoR obligations as a consignor?',
      'How do I maintain NHVAS accreditation?',
      'What records must I keep for work diaries?',
    ],
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare',
    fullName: 'National Safety and Quality Health Service Standards',
    authority: 'Australian Commission on Safety and Quality in Health Care',
    icon: 'Heart',
    color: 'red',
    keyAreas: [
      'Clinical Governance',
      'Partnering with Consumers',
      'Infection Prevention',
      'Medication Safety',
      'Patient Identification',
      'Clinical Handover',
      'Blood Management',
      'Recognising Deterioration',
    ],
    regulations: [
      'Health Practitioner Regulation National Law',
      'Australian Health Service Safety and Quality Standards',
      'Private Health Facilities Act',
      'Medicines and Poisons Act',
    ],
    authorities: ['AHPRA', 'Australian Commission on Safety and Quality in Health Care', 'WA Department of Health'],
    suggestedPrompts: [
      'What clinical governance requirements apply?',
      'How do I manage medication compliance?',
      'Explain infection control standards',
      'What patient safety incidents must be reported?',
    ],
  },
  aged_care: {
    id: 'aged_care',
    name: 'Aged Care',
    fullName: 'Aged Care Quality Standards',
    authority: 'Aged Care Quality and Safety Commission',
    icon: 'Users',
    color: 'purple',
    keyAreas: [
      'Consumer Dignity and Choice',
      'Ongoing Assessment and Planning',
      'Personal Care and Clinical Care',
      'Services and Supports',
      'Organisation Service Environment',
      'Feedback and Complaints',
      'Human Resources',
      'Organisational Governance',
    ],
    regulations: [
      'Aged Care Act 1997',
      'Aged Care Quality Standards',
      'Serious Incident Response Scheme (SIRS)',
    ],
    authorities: ['Aged Care Quality and Safety Commission', 'Department of Health and Aged Care'],
    suggestedPrompts: [
      'Explain the 8 Aged Care Quality Standards',
      'What incidents must be reported to SIRS?',
      'What are the care minute requirements?',
      'How do I manage restraint compliance?',
    ],
  },
  workplace: {
    id: 'workplace',
    name: 'Workplace Safety',
    fullName: 'Work Health and Safety Act & Regulations',
    authority: 'WorkSafe / SafeWork Australia',
    icon: 'HardHat',
    color: 'yellow',
    keyAreas: [
      'PCBU Duties',
      'Risk Management',
      'Consultation',
      'Training & Competency',
      'Incident Notification',
      'Hazardous Work',
      'Emergency Procedures',
      'Worker Health Monitoring',
    ],
    regulations: [
      'Work Health and Safety Act 2020 (WA)',
      'WHS Regulations',
      'Codes of Practice',
      'Fair Work Act',
    ],
    authorities: ['WorkSafe WA', 'Fair Work Commission', 'Fair Work Ombudsman'],
    suggestedPrompts: [
      'What are PCBU duties under WHS?',
      'How do I conduct a risk assessment?',
      'What incidents must be notified to WorkSafe?',
      'Explain psychosocial hazard requirements',
    ],
  },
  construction: {
    id: 'construction',
    name: 'Construction',
    fullName: 'WHS Regulations - Construction Work',
    authority: 'WorkSafe',
    icon: 'Building',
    color: 'amber',
    keyAreas: [
      'Safe Work Method Statements',
      'Principal Contractor Duties',
      'High Risk Work Licensing',
      'Working at Heights',
      'Excavation Safety',
      'Asbestos Management',
      'Electrical Safety',
      'Plant & Equipment',
    ],
    regulations: [
      'WHS Regulations - Construction Work',
      'Building Act 2011 (WA)',
      'High Risk Work Licensing',
    ],
    authorities: ['WorkSafe WA', 'Building and Energy WA'],
    suggestedPrompts: [
      'When do I need a SWMS?',
      'What are principal contractor obligations?',
      'Explain high risk work licensing',
      'What asbestos requirements apply?',
    ],
  },
};

export const SECTOR_IDS = Object.keys(SECTORS) as SectorId[];

export function isValidSector(value: string): value is SectorId {
  return value in SECTORS;
}

export function getSectorConfig(sector: string): SectorConfig | undefined {
  return SECTORS[sector as SectorId];
}
