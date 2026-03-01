'use client';

import { ProgressProvider } from '@bprogress/next/app';

const ProgressBarProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProgressProvider
      color="var(--foreground)"
      height="2px"
      delay={500}
      options={{ showSpinner: false }}
    >
      {children}
    </ProgressProvider>
  );
};

export default ProgressBarProvider;