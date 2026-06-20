"use client";

import {
  formatExpAbbrev,
  formatExpDetail,
  isExpAbbreviated,
} from "@/features/user/lib/format-exp";
import { SimpleTooltip } from "@/shared/ui/common/simple-tooltip";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";

type ExpAmountMessageKey = "expAmount" | "expAmountRemaining";

interface ExpAmountLabelProps {
  exp: number;
  messageKey?: ExpAmountMessageKey;
  className?: string;
  testId?: string;
}

export function ExpAmountLabel({
  exp,
  messageKey = "expAmount",
  className,
  testId,
}: ExpAmountLabelProps) {
  const t = useTranslations("user.progress");
  const abbreviated = formatExpAbbrev(exp);
  const label = t(messageKey, { amount: abbreviated });

  if (!isExpAbbreviated(exp)) {
    return (
      <span className={className} data-testid={testId}>
        {label}
      </span>
    );
  }

  return (
    <SimpleTooltip content={t(messageKey, { amount: formatExpDetail(exp) })}>
      <span
        className={cn(
          className,
          "cursor-default underline decoration-dotted decoration-muted-foreground/60 underline-offset-2",
        )}
        data-testid={testId}
        tabIndex={0}
      >
        {label}
      </span>
    </SimpleTooltip>
  );
}
