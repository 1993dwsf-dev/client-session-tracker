import type { ReactNode } from "react";
import { FileSpreadsheet, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormulaBar({
  cell,
  value,
}: {
  cell: string;
  value?: string;
}) {
  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-border/70 bg-muted/40">
      <div className="flex w-20 shrink-0 items-center justify-center border-r border-border/70 text-xs font-semibold tracking-widest text-muted-foreground">
        {cell}
      </div>
      <div className="flex flex-1 items-center gap-2 px-3">
        <Sigma className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-xs text-foreground/80">
          {value ?? ""}
        </span>
      </div>
    </div>
  );
}

export function SheetTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: string; label: string; icon: ReactNode }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-9 shrink-0 items-stretch border-t border-border/70 bg-muted/40">
      <div className="hidden items-center px-2.5 sm:flex">
        <FileSpreadsheet className="size-3.5 text-muted-foreground" />
      </div>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative flex items-center gap-1.5 border-r border-border/70 px-3 text-xs font-medium transition-colors sm:px-4",
            active === tab.value
              ? "bg-card text-foreground after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-primary"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
