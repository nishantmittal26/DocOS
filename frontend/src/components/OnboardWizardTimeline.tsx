import React from 'react';
import { LucideIcon, Check } from 'lucide-react';

export interface OnboardWizardStep {
  num: number;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface OnboardWizardTimelineProps {
  steps: OnboardWizardStep[];
  currentStep: number;
  isStepDataReady: (stepNum: number) => boolean;
}

export const OnboardWizardTimeline: React.FC<OnboardWizardTimelineProps> = ({
  steps,
  currentStep,
  isStepDataReady,
}) => {
  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex items-start w-full">
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.num;
          const isPast = currentStep > step.num;
          const dataReady = isStepDataReady(step.num);
          const isEmphasized = dataReady && (isPast || isCurrent);
          const Icon = step.icon;
          const connectorFilled = index < steps.length - 1 && currentStep > step.num;

          return (
            <React.Fragment key={step.num}>
              <li className="flex flex-col items-center flex-1 min-w-0 relative z-10">
                <div
                  className={`flex flex-col items-center px-1 sm:px-2 py-2 rounded-xl transition-all w-full ${
                    isCurrent
                      ? 'bg-emerald-50 border border-emerald-200 shadow-sm'
                      : isEmphasized
                      ? 'bg-slate-100 border border-slate-300'
                      : 'border border-transparent'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1.5 transition-all ${
                      isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md'
                        : isPast
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : isEmphasized
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPast ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" aria-hidden />
                    ) : (
                      <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" aria-hidden />
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs text-center leading-tight max-w-[5.5rem] sm:max-w-none ${
                      isCurrent
                        ? 'font-bold text-emerald-900'
                        : isPast
                        ? 'font-bold text-emerald-900'
                        : isEmphasized
                        ? 'font-semibold text-slate-800'
                        : 'font-medium text-slate-400'
                    }`}
                  >
                    <span className="sm:hidden">{step.shortLabel}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </span>
                  {dataReady && !isPast && step.num !== 4 && (
                    <span className="text-[9px] text-slate-500 mt-0.5 hidden sm:inline">Ready</span>
                  )}
                </div>
              </li>

              {index < steps.length - 1 && (
                <li
                  className="flex-[1.2] min-w-[12px] max-w-[80px] sm:max-w-none list-none self-center -mt-6 sm:-mt-8 px-0.5"
                  aria-hidden
                >
                  <div
                    className={`h-1 rounded-full transition-colors duration-300 ${
                      connectorFilled ? 'bg-emerald-700' : dataReady && currentStep === step.num ? 'bg-emerald-300' : 'bg-slate-200'
                    }`}
                  />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
      <p className="text-[10px] text-slate-500 text-center mt-2 sm:mt-3">
        Filled steps reflect your wizard progress only — nothing is saved to the server until the final submit.
      </p>
    </nav>
  );
};
