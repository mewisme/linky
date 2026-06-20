import type { CSSProperties } from 'react';

export function SpinnerClassic({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '0.900s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f100011 { 0% { opacity: 1; } 16.66% { opacity: 1; } 16.67% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f100001 { 0% { opacity: 1; } 16.66% { opacity: 1; } 16.67% { opacity: 0; } 83.32% { opacity: 0; } 83.33% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f110001 { 0% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 83.32% { opacity: 0; } 83.33% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f000011 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f110000 { 0% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000111 { 0% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111000 { 0% { opacity: 1; } 49.99% { opacity: 1; } 50.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000110 { 0% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 83.32% { opacity: 1; } 83.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011000 { 0% { opacity: 0; } 16.66% { opacity: 0; } 16.67% { opacity: 1; } 49.99% { opacity: 1; } 50.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001110 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 83.32% { opacity: 1; } 83.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001100 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011100 { 0% { opacity: 0; } 16.66% { opacity: 0; } 16.67% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
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
      <circle className="on" cx="15" cy="9" r="2" opacity={1} style={{ animation: 'f100011 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={1} style={{ animation: 'f100001 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={1} style={{ animation: 'f110001 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle cx="39" cy="9" r="2" />
      <circle cx="3" cy="15" r="2" />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={0} style={{ animation: 'f000011 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle cx="21" cy="15" r="2" />
      <circle cx="27" cy="15" r="2" />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={1} style={{ animation: 'f110000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle cx="3" cy="21" r="2" />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f000111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle cx="21" cy="21" r="2" />
      <circle cx="27" cy="21" r="2" />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={1} style={{ animation: 'f111000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle cx="3" cy="27" r="2" />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'f000110 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle cx="21" cy="27" r="2" />
      <circle cx="27" cy="27" r="2" />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f011000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle cx="3" cy="33" r="2" />
      <circle cx="9" cy="33" r="2" />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f001110 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={0} style={{ animation: 'f001100 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f011100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="33" r="2" />
      <circle cx="39" cy="33" r="2" />
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