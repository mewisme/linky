"use client";

import { IconRefresh } from "@tabler/icons-react";
import { Button } from "@ws/ui/components/ui/button";
import { useTranslations } from "next-intl";

import { SimpleTooltip } from "@/shared/ui/common/simple-tooltip";

interface DataTableRefreshButtonProps {
  onClick: () => void;
  isFetching?: boolean;
  tooltip?: string;
  testId?: string;
}

/**
 * Compact refresh button for the data-table toolbar. Shows only the icon at
 * all breakpoints and surfaces a tooltip so the action is discoverable.
 */
export function DataTableRefreshButton({
  onClick,
  isFetching = false,
  tooltip,
  testId = "data-table-refresh-button",
}: DataTableRefreshButtonProps) {
  const t = useTranslations("dataTable.common");
  return (
    <SimpleTooltip content={tooltip ?? t("refreshTooltip")}>
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={isFetching}
        aria-label={tooltip ?? t("refreshTooltip")}
        data-testid={testId}
      >
        <IconRefresh className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
      </Button>
    </SimpleTooltip>
  );
}
