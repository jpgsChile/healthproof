"use client";

interface StepIndicatorProps {
  current: number;
  labels: string[];
  completed?: readonly boolean[];
}

export function StepIndicator({
  current,
  labels,
  completed,
}: StepIndicatorProps) {
  return (
    <div className="grid grid-cols-5 items-start gap-1 px-4 pt-4">
      {labels.map((label, i) => {
        const isActive = i === current;
        const isDone = completed ? completed[i] : i < current;
        return (
          <div
            key={label}
            className="min-w-0"
            aria-current={isActive ? "step" : undefined}
          >
            <div className="flex min-w-0 flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isActive
                      ? "bg-sky-500 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`max-w-full text-center text-[10px] font-medium ${isActive ? "text-sky-600" : "text-slate-400"}`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
