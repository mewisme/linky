import type { CSSProperties } from 'react';

export function SpinnerTheClaw({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '3.150s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f000000000000000001100 { 0% { opacity: 0; } 80.94% { opacity: 0; } 80.95% { opacity: 1; } 90.47% { opacity: 1; } 90.48% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000011000000001110 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 42.85% { opacity: 1; } 42.86% { opacity: 0; } 80.94% { opacity: 0; } 80.95% { opacity: 1; } 95.23% { opacity: 1; } 95.24% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000001111111111110 { 0% { opacity: 0; } 38.09% { opacity: 0; } 38.10% { opacity: 1; } 95.23% { opacity: 1; } 95.24% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000001100011000 { 0% { opacity: 0; } 52.37% { opacity: 0; } 52.38% { opacity: 1; } 61.89% { opacity: 1; } 61.90% { opacity: 0; } 76.18% { opacity: 0; } 76.19% { opacity: 1; } 85.70% { opacity: 1; } 85.71% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000001111100011100 { 0% { opacity: 0; } 38.09% { opacity: 0; } 38.10% { opacity: 1; } 61.89% { opacity: 1; } 61.90% { opacity: 0; } 76.18% { opacity: 0; } 76.19% { opacity: 1; } 90.47% { opacity: 1; } 90.48% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000111111111100 { 0% { opacity: 0; } 42.85% { opacity: 0; } 42.86% { opacity: 1; } 90.47% { opacity: 1; } 90.48% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000001110110000 { 0% { opacity: 0; } 52.37% { opacity: 0; } 52.38% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 71.42% { opacity: 0; } 71.43% { opacity: 1; } 80.94% { opacity: 1; } 80.95% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000110010111000 { 0% { opacity: 0; } 42.85% { opacity: 0; } 42.86% { opacity: 1; } 52.37% { opacity: 1; } 52.38% { opacity: 0; } 61.89% { opacity: 0; } 61.90% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 71.42% { opacity: 0; } 71.43% { opacity: 1; } 85.70% { opacity: 1; } 85.71% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000000011111000 { 0% { opacity: 0; } 61.89% { opacity: 0; } 61.90% { opacity: 1; } 85.70% { opacity: 1; } 85.71% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000000011100000 { 0% { opacity: 0; } 61.89% { opacity: 0; } 61.90% { opacity: 1; } 76.18% { opacity: 1; } 76.19% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000000001110000 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 80.94% { opacity: 1; } 80.95% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011100000000000000000 { 0% { opacity: 0; } 4.75% { opacity: 0; } 4.76% { opacity: 1; } 19.04% { opacity: 1; } 19.05% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001110000000001000000 { 0% { opacity: 0; } 9.51% { opacity: 0; } 9.52% { opacity: 1; } 23.80% { opacity: 1; } 23.81% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 71.42% { opacity: 1; } 71.43% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000111111111111100000 { 0% { opacity: 0; } 14.28% { opacity: 0; } 14.29% { opacity: 1; } 76.18% { opacity: 1; } 76.19% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000011111111111100000 { 0% { opacity: 0; } 19.04% { opacity: 0; } 19.05% { opacity: 1; } 76.18% { opacity: 1; } 76.19% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001111111111100000 { 0% { opacity: 0; } 23.80% { opacity: 0; } 23.81% { opacity: 1; } 76.18% { opacity: 1; } 76.19% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000000001000000 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 71.42% { opacity: 1; } 71.43% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001110000000000000000 { 0% { opacity: 0; } 9.51% { opacity: 0; } 9.52% { opacity: 1; } 23.80% { opacity: 1; } 23.81% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000111111111111000000 { 0% { opacity: 0; } 14.28% { opacity: 0; } 14.29% { opacity: 1; } 71.42% { opacity: 1; } 71.43% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000011111111111000000 { 0% { opacity: 0; } 19.04% { opacity: 0; } 19.05% { opacity: 1; } 71.42% { opacity: 1; } 71.43% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001111111111000000 { 0% { opacity: 0; } 23.80% { opacity: 0; } 23.81% { opacity: 1; } 71.42% { opacity: 1; } 71.43% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle cx="9" cy="3" r="2" />
      <circle className="on" cx="9" cy="3" r="2" opacity={0} style={{ animation: 'f000000000000000001100 var(--dur) linear infinite' }} />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={0} style={{ animation: 'f000000011000000001110 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" opacity={0} style={{ animation: 'f000000001111111111110 var(--dur) linear infinite' }} />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={0} style={{ animation: 'f000000011000000001110 var(--dur) linear infinite' }} />
      <circle cx="33" cy="3" r="2" />
      <circle className="on" cx="33" cy="3" r="2" opacity={0} style={{ animation: 'f000000000000000001100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="3" r="2" />
      <circle cx="3" cy="9" r="2" />
      <circle cx="9" cy="9" r="2" />
      <circle className="on" cx="9" cy="9" r="2" opacity={0} style={{ animation: 'f000000000001100011000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'f000000001111100011100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'f000000000111111111100 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f000000001111100011100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle className="on" cx="33" cy="9" r="2" opacity={0} style={{ animation: 'f000000000001100011000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="9" r="2" />
      <circle cx="3" cy="15" r="2" />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={0} style={{ animation: 'f000000000001110110000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'f000000000110010111000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'f000000000000011111000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f000000000110010111000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f000000000001110110000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle cx="3" cy="21" r="2" />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f000000000000011100000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'f000000000000001110000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f000000000000001110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f000000000000001110000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f000000000000011100000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={0} style={{ animation: 'f011100000000000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'f001110000000001000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={0} style={{ animation: 'f000111111111111100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={0} style={{ animation: 'f000011111111111100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f000001111111111100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f000000000000001000000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle cx="3" cy="33" r="2" />
      <circle className="on" cx="3" cy="33" r="2" opacity={0} style={{ animation: 'f011100000000000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="33" r="2" />
      <circle className="on" cx="9" cy="33" r="2" opacity={0} style={{ animation: 'f001110000000000000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f000111111111111000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={0} style={{ animation: 'f000011111111111000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f000001111111111000000 var(--dur) linear infinite' }} />
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