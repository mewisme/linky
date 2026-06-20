import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ws/ui/components/ui/tooltip";

export function SimpleTooltip({
  children,
  content,
  side = "top",
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
