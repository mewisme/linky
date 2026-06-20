import type { CSSProperties } from 'react';

export function SpinnerBarChart({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '1.800s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f000000001000 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000100000000 { 0% { opacity: 0; } 24.99% { opacity: 0; } 25.00% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000100 { 0% { opacity: 0; } 74.99% { opacity: 0; } 75.00% { opacity: 1; } 83.32% { opacity: 1; } 83.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001110000000 { 0% { opacity: 0; } 16.66% { opacity: 0; } 16.67% { opacity: 1; } 41.66% { opacity: 1; } 41.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000010000000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 41.66% { opacity: 1; } 41.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011100000000 { 0% { opacity: 0; } 8.32% { opacity: 0; } 8.33% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000011100 { 0% { opacity: 0; } 58.32% { opacity: 0; } 58.33% { opacity: 1; } 83.32% { opacity: 1; } 83.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000001110 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 91.66% { opacity: 1; } 91.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000111000000 { 0% { opacity: 0; } 24.99% { opacity: 0; } 25.00% { opacity: 1; } 49.99% { opacity: 1; } 50.00% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle cx="9" cy="3" r="2" />
      <circle cx="15" cy="3" r="2" />
      <circle cx="21" cy="3" r="2" />
      <circle cx="27" cy="3" r="2" />
      <circle cx="33" cy="3" r="2" />
      <circle cx="39" cy="3" r="2" />
      <circle cx="3" cy="9" r="2" />
      <circle cx="9" cy="9" r="2" />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'f000000001000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'f000100000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f000000000100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle cx="39" cy="9" r="2" />
      <circle cx="3" cy="15" r="2" />
      <circle cx="9" cy="15" r="2" />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'f000000001000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'f001110000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f000000000100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f000010000000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle cx="3" cy="21" r="2" />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f011100000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'f000000011100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f001110000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f000000001110 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f000111000000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" />
      <circle cx="39" cy="27" r="2" />
      <circle className="on" cx="39" cy="27" r="2" />
      <circle cx="3" cy="33" r="2" />
      <circle className="on" cx="3" cy="33" r="2" />
      <circle cx="9" cy="33" r="2" />
      <circle className="on" cx="9" cy="33" r="2" />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" />
      <circle cx="33" cy="33" r="2" />
      <circle className="on" cx="33" cy="33" r="2" />
      <circle cx="39" cy="33" r="2" />
      <circle className="on" cx="39" cy="33" r="2" />
      <circle cx="3" cy="39" r="2" />
      <circle cx="9" cy="39" r="2" />
      <circle cx="15" cy="39" r="2" />
      <circle cx="21" cy="39" r="2" />
      <circle cx="27" cy="39" r="2" />
      <circle cx="33" cy="39" r="2" />
      <circle cx="39" cy="39" r="2" />
    </svg>
  );
}