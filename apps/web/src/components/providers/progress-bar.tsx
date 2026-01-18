'use client';

import { ProgressProvider } from '@bprogress/next/app';

const ProgressBarProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProgressProvider
      height="4px"
      color="#f1f1f1"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  );
};

export default ProgressBarProvider;