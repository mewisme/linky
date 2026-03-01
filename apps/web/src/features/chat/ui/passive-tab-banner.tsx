import { IconDeviceDesktop } from "@tabler/icons-react";

export function PassiveTabBanner() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-muted/50 p-8">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <IconDeviceDesktop className="size-12 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Call is active in another tab</h2>
          <p className="text-sm text-muted-foreground">
            You have an ongoing call in a different browser tab. Please use that tab to continue your call.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Close this tab or navigate to a different page.
        </p>
      </div>
    </div>
  );
}
