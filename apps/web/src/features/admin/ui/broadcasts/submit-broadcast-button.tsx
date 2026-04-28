"use client";

import { IconLoader2, IconSend } from "@tabler/icons-react";
import { Button } from "@ws/ui/components/ui/button";
import type { BroadcastFormTranslationFn } from "./form-create.types";

interface SubmitBroadcastButtonProps {
  tbf: BroadcastFormTranslationFn;
  isSubmitting: boolean;
}

export function SubmitBroadcastButton({
  tbf,
  isSubmitting,
}: SubmitBroadcastButtonProps) {
  return (
    <div className="flex flex-col border-t pt-4 sm:flex-row sm:justify-end">
      <Button
        type="submit"
        disabled={isSubmitting}
        size="lg"
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <IconLoader2 className="mr-2 size-4 animate-spin" />
            {tbf("sending")}
          </>
        ) : (
          <>
            <IconSend className="mr-2 size-4" />
            {tbf("sendBroadcast")}
          </>
        )}
      </Button>
    </div>
  );
}
