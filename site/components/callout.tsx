import { Info, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutType = "note" | "tip" | "warning";

const styles: Record<CalloutType, { icon: React.ReactNode; classes: string }> = {
  note: {
    icon: <Info className="size-4 shrink-0 mt-0.5" aria-hidden="true" />,
    classes:
      "border-[var(--brand)]/30 bg-[var(--brand)]/5 text-foreground [&_a]:text-[var(--brand)]",
  },
  tip: {
    icon: <Lightbulb className="size-4 shrink-0 mt-0.5 text-emerald-500" aria-hidden="true" />,
    classes: "border-emerald-500/30 bg-emerald-500/5 text-foreground",
  },
  warning: {
    icon: (
      <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
    ),
    classes: "border-amber-500/30 bg-amber-500/5 text-foreground",
  },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Callout({ type = "note", title, children, className }: CalloutProps) {
  const { icon, classes } = styles[type];
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm leading-relaxed",
        classes,
        className
      )}
    >
      {icon}
      <div className="flex flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
