import React from 'react';
import { Filter } from 'lucide-react';

export type CatalogScope = 'clinic' | 'clinicAndGlobal';

export function matchesCatalogScope(isClinicOwned: boolean, scope: CatalogScope): boolean {
  if (scope === 'clinicAndGlobal') {
    return true;
  }
  return isClinicOwned;
}

export function CatalogSourceBadge({ isClinicOwned }: { isClinicOwned: boolean }) {
  if (isClinicOwned) {
    return (
      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
        Clinic custom
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
      Global catalog
    </span>
  );
}

interface CatalogScopeFilterProps {
  value: CatalogScope;
  onChange: (value: CatalogScope) => void;
  className?: string;
}

export const CatalogScopeFilter: React.FC<CatalogScopeFilterProps> = ({ value, onChange, className = '' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CatalogScope)}
        className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-semibold text-slate-700"
        aria-label="Catalog scope"
      >
        <option value="clinic">Clinic only</option>
        <option value="clinicAndGlobal">Include global catalog</option>
      </select>
    </div>
  );
};
