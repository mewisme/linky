import type { CSSProperties } from 'react';

export function SpinnerTumbleweed({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '1.950s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f0110000000000 { 0% { opacity: 0; } 7.68% { opacity: 0; } 7.69% { opacity: 1; } 23.07% { opacity: 1; } 23.08% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000011000000 { 0% { opacity: 0; } 38.45% { opacity: 0; } 38.46% { opacity: 1; } 53.84% { opacity: 1; } 53.85% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000000001100 { 0% { opacity: 0; } 69.22% { opacity: 0; } 69.23% { opacity: 1; } 84.61% { opacity: 1; } 84.62% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0111100000000 { 0% { opacity: 0; } 7.68% { opacity: 0; } 7.69% { opacity: 1; } 38.45% { opacity: 1; } 38.46% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0001111000000 { 0% { opacity: 0; } 23.07% { opacity: 0; } 23.08% { opacity: 1; } 53.84% { opacity: 1; } 53.85% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000011110000 { 0% { opacity: 0; } 38.45% { opacity: 0; } 38.46% { opacity: 1; } 69.22% { opacity: 1; } 69.23% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000011111100 { 0% { opacity: 0; } 38.45% { opacity: 0; } 38.46% { opacity: 1; } 84.61% { opacity: 1; } 84.62% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000000001111 { 0% { opacity: 0; } 69.22% { opacity: 0; } 69.23% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0001100000000 { 0% { opacity: 0; } 23.07% { opacity: 0; } 23.08% { opacity: 1; } 38.45% { opacity: 1; } 38.46% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000000110000 { 0% { opacity: 0; } 53.84% { opacity: 0; } 53.85% { opacity: 1; } 69.22% { opacity: 1; } 69.23% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000000000011 { 0% { opacity: 0; } 84.61% { opacity: 0; } 84.62% { opacity: 1; } 100% { opacity: 1; } }
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
      <circle cx="21" cy="9" r="2" />
      <circle cx="27" cy="9" r="2" />
      <circle cx="33" cy="9" r="2" />
      <circle cx="39" cy="9" r="2" />
      <circle cx="3" cy="15" r="2" />
      <circle className="on" cx="3" cy="15" r="2" opacity={0} style={{ animation: 'f0110000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="15" r="2" />
      <circle cx="15" cy="15" r="2" />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'f0000011000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f0000000001100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle cx="3" cy="21" r="2" />
      <circle className="on" cx="3" cy="21" r="2" opacity={0} style={{ animation: 'f0110000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f0111100000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'f0001111000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f0000011110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f0000011111100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f0000000001100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle className="on" cx="39" cy="21" r="2" opacity={0} style={{ animation: 'f0000000001111 var(--dur) linear infinite' }} />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={0} style={{ animation: 'f0110000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'f0001100000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={0} style={{ animation: 'f0001100000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={0} style={{ animation: 'f0000011110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f0000000110000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f0000000001100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle className="on" cx="39" cy="27" r="2" opacity={0} style={{ animation: 'f0000000000011 var(--dur) linear infinite' }} />
      <circle cx="3" cy="33" r="2" />
      <circle cx="9" cy="33" r="2" />
      <circle cx="15" cy="33" r="2" />
      <circle cx="21" cy="33" r="2" />
      <circle cx="27" cy="33" r="2" />
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