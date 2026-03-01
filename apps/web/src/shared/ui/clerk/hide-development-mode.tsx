'use client';

export function HideDevelopmentMode({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        .cl-footer > div:last-child {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  )
}
