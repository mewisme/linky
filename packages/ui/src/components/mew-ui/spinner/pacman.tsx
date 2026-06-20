import type { CSSProperties } from 'react';

export function SpinnerPacman({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '2.250s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f000001100000000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000110000000 { 0% { opacity: 0; } 39.99% { opacity: 0; } 40.00% { opacity: 1; } 53.32% { opacity: 1; } 53.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000111000000 { 0% { opacity: 0; } 39.99% { opacity: 0; } 40.00% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000011100000 { 0% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000110000 { 0% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 73.32% { opacity: 1; } 73.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000111000 { 0% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 79.99% { opacity: 1; } 80.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000011100 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 86.66% { opacity: 1; } 86.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001110000000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 53.32% { opacity: 1; } 53.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001111000000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000001110000 { 0% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 73.32% { opacity: 1; } 73.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000001111000 { 0% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 79.99% { opacity: 1; } 80.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000011110 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 93.32% { opacity: 1; } 93.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000011110000000 { 0% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 53.32% { opacity: 1; } 53.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000011000000 { 0% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000001100000 { 0% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011111111110000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 73.32% { opacity: 1; } 73.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000011000 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 79.99% { opacity: 1; } 80.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000001110 { 0% { opacity: 0; } 73.32% { opacity: 0; } 73.33% { opacity: 1; } 93.32% { opacity: 1; } 93.33% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle cx="9" cy="3" r="2" />
      <circle cx="15" cy="3" r="2" />
      <circle cx="21" cy="3" r="2" />
      <circle cx="27" cy="3" r="2" />
      <circle cx="33" cy="3" r="2" />
      <circle cx="39" cy="3" r="2" />
      <circle cx="3" cy="9" r="2" />
      <circle className="on" cx="3" cy="9" r="2" opacity={0} style={{ animation: 'f000001100000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="9" r="2" />
      <circle className="on" cx="9" cy="9" r="2" opacity={0} style={{ animation: 'f000000110000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'f000000111000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'f000000011100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f000000000110000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle className="on" cx="33" cy="9" r="2" opacity={0} style={{ animation: 'f000000000111000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="9" r="2" />
      <circle className="on" cx="39" cy="9" r="2" opacity={0} style={{ animation: 'f000000000011100 var(--dur) linear infinite' }} />
      <circle cx="3" cy="15" r="2" />
      <circle className="on" cx="3" cy="15" r="2" opacity={0} style={{ animation: 'f000001110000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={0} style={{ animation: 'f000001111000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'f000000011100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'f000000001110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f000000001111000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f000000000011100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle className="on" cx="39" cy="15" r="2" opacity={0} style={{ animation: 'f000000000011110 var(--dur) linear infinite' }} />
      <circle cx="3" cy="21" r="2" />
      <circle className="on" cx="3" cy="21" r="2" opacity={0} style={{ animation: 'f000011110000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f000000011000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'f000000001100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f011111111110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f000000000011000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f000000000011100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle className="on" cx="39" cy="21" r="2" opacity={0} style={{ animation: 'f000000000001110 var(--dur) linear infinite' }} />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={0} style={{ animation: 'f000001110000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'f000001111000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={0} style={{ animation: 'f000000011100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={0} style={{ animation: 'f000000001110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f000000001111000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f000000000011100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle className="on" cx="39" cy="27" r="2" opacity={0} style={{ animation: 'f000000000011110 var(--dur) linear infinite' }} />
      <circle cx="3" cy="33" r="2" />
      <circle className="on" cx="3" cy="33" r="2" opacity={0} style={{ animation: 'f000001100000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="33" r="2" />
      <circle className="on" cx="9" cy="33" r="2" opacity={0} style={{ animation: 'f000000110000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f000000111000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={0} style={{ animation: 'f000000011100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f000000000110000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="33" r="2" />
      <circle className="on" cx="33" cy="33" r="2" opacity={0} style={{ animation: 'f000000000111000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="33" r="2" />
      <circle className="on" cx="39" cy="33" r="2" opacity={0} style={{ animation: 'f000000000011100 var(--dur) linear infinite' }} />
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