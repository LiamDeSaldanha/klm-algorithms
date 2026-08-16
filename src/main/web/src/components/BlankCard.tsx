import { useId, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function BlankCard({
  title,
  defaultHighlighted = false,
  highlighted: highlightedProp,
  onHighlightChange,
  showToggle = true,
  className,
  children,
}: {
  title?: string;
  defaultHighlighted?: boolean;
  /** Pass this to drive highlighting externally (e.g. from a stepper). When provided, the card's own toggle no longer owns the state. */
  highlighted?: boolean;
  onHighlightChange?: (highlighted: boolean) => void;
  /** Hide the manual "Highlight" toggle — useful when `highlighted` is externally controlled. */
  showToggle?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const inputId = useId();
  const isControlled = highlightedProp !== undefined;
  const [internalHighlighted, setInternalHighlighted] = useState(defaultHighlighted);
  const highlighted = isControlled ? highlightedProp : internalHighlighted;

  const toggle = (checked: boolean) => {
    if (!isControlled) setInternalHighlighted(checked);
    onHighlightChange?.(checked);
  };

  return (
    <Card
      className={cn(
        "transition-colors duration-200",
        highlighted && "border-sky-300 bg-sky-50",
        className
      )}
    >
      <CardHeader className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 space-y-0 p-2.5">
        <span />
        {title ? (
          <span className="text-center text-xs font-semibold">{title}</span>
        ) : (
          <span />
        )}
        <div className="flex items-center justify-self-end gap-1.5">
          {showToggle && (
            <>
              <Label htmlFor={inputId} className="text-[10px] text-muted-foreground">
                Highlight
              </Label>
              <Switch
                id={inputId}
                checked={highlighted}
                onCheckedChange={toggle}
              />
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-center p-2.5 pt-0">{children}</CardContent>
    </Card>
  );
}
