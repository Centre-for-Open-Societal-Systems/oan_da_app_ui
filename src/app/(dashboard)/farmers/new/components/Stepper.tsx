import { Fragment } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { REGISTRATION_STEPS } from "../steps";

export function Stepper({ currentStep }: { currentStep: number }) {
  const activeStep = REGISTRATION_STEPS[currentStep - 1];

  return (
    <Card className="px-3.5 py-4 sm:px-5 sm:py-5 shadow-card">
      <ol className="flex items-start justify-between w-full min-w-0">
        {REGISTRATION_STEPS.map((step, i) => {
          const stepNo = i + 1;
          const isActive = stepNo === currentStep;
          const isDone = stepNo < currentStep;
          const isLast = i === REGISTRATION_STEPS.length - 1;

          return (
            <Fragment key={step.label}>
              <li className="flex flex-1 shrink-0 flex-col items-center min-w-0">
                <div
                  className={cn(
                    "relative z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-[12px] sm:text-[14px] font-semibold ring-3 sm:ring-4 transition-all duration-200",
                    isActive || isDone
                      ? "bg-brand-green text-white ring-brand-tint shadow-xs"
                      : "bg-line text-gray-500 ring-gray-100"
                  )}
                >
                  {isDone ? (
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    stepNo
                  )}
                </div>

                <span className={cn("mt-2 hidden text-[11px] sm:text-[12px] font-semibold sm:block", isActive ? "text-brand-green" : "text-gray-500")}>
                  Step {stepNo}
                </span>
                <span className={cn("mt-0.5 hidden text-[11px] sm:text-[12px] sm:block text-center truncate max-w-full px-1", isActive ? "font-semibold text-ink" : "font-medium text-gray-500")}>
                  {step.label}
                </span>
              </li>

              {!isLast && (
                <li
                  aria-hidden
                  className={cn("mt-[13px] sm:mt-[15px] h-0.5 flex-1 -mx-2 sm:-mx-3 md:-mx-4 lg:-mx-6 transition-colors", isDone ? "bg-brand-green" : "bg-line")}
                />
              )}
            </Fragment>
          );
        })}
      </ol>

      {/* Mobile step status indicator */}
      {activeStep && (
        <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-line-soft pt-2.5 sm:hidden">
          <span className="text-[12px] font-semibold text-brand-green">Step {currentStep} of {REGISTRATION_STEPS.length}:</span>
          <span className="text-[12px] font-bold text-ink">{activeStep.label}</span>
        </div>
      )}
    </Card>
  );
}
