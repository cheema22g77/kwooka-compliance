"use client";

import React from "react";
import { Truck, Heart, Accessibility, Home, Briefcase, HardHat, Globe } from "lucide-react";

interface SectorSelectorProps {
  value: string | null;
  onChange: (sector: string | null) => void;
}

const SECTORS = [
  { value: null, label: 'All Sectors', icon: Globe },
  { value: 'transport', label: 'Transport', icon: Truck },
  { value: 'healthcare', label: 'Healthcare', icon: Heart },
  { value: 'ndis', label: 'NDIS', icon: Accessibility },
  { value: 'aged_care', label: 'Aged Care', icon: Home },
  { value: 'workplace', label: 'Workplace', icon: Briefcase },
  { value: 'construction', label: 'Construction', icon: HardHat },
];

export function SectorSelector({ value, onChange }: SectorSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SECTORS.map((sector) => {
        const Icon = sector.icon;
        const isActive = value === sector.value;
        return (
          <button
            key={sector.value || 'all'}
            onClick={() => onChange(sector.value)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-orange-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {sector.label}
          </button>
        );
      })}
    </div>
  );
}
