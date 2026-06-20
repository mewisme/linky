import type { CSSProperties } from 'react';

export function SpinnerNewton({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '2.400s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f0000100000000000 { 0% { opacity: 0; } 24.99% { opacity: 0; } 25.00% { opacity: 1; } 31.24% { opacity: 1; } 31.25% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000000000001000 { 0% { opacity: 0; } 74.99% { opacity: 0; } 75.00% { opacity: 1; } 81.24% { opacity: 1; } 81.25% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0001010000000000 { 0% { opacity: 0; } 18.74% { opacity: 0; } 18.75% { opacity: 1; } 24.99% { opacity: 1; } 25.00% { opacity: 0; } 31.24% { opacity: 0; } 31.25% { opacity: 1; } 37.49% { opacity: 1; } 37.50% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000000000010100 { 0% { opacity: 0; } 68.74% { opacity: 0; } 68.75% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 81.24% { opacity: 0; } 81.25% { opacity: 1; } 87.49% { opacity: 1; } 87.50% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0010001000000000 { 0% { opacity: 0; } 12.49% { opacity: 0; } 12.50% { opacity: 1; } 18.74% { opacity: 1; } 18.75% { opacity: 0; } 37.49% { opacity: 0; } 37.50% { opacity: 1; } 43.74% { opacity: 1; } 43.75% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000000000100010 { 0% { opacity: 0; } 62.49% { opacity: 0; } 62.50% { opacity: 1; } 68.74% { opacity: 1; } 68.75% { opacity: 0; } 87.49% { opacity: 0; } 87.50% { opacity: 1; } 93.74% { opacity: 1; } 93.75% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0011011000000000 { 0% { opacity: 0; } 12.49% { opacity: 0; } 12.50% { opacity: 1; } 24.99% { opacity: 1; } 25.00% { opacity: 0; } 31.24% { opacity: 0; } 31.25% { opacity: 1; } 43.74% { opacity: 1; } 43.75% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0110001100000000 { 0% { opacity: 0; } 6.24% { opacity: 0; } 6.25% { opacity: 1; } 18.74% { opacity: 1; } 18.75% { opacity: 0; } 37.49% { opacity: 0; } 37.50% { opacity: 1; } 49.99% { opacity: 1; } 50.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0100000100000000 { 0% { opacity: 0; } 6.24% { opacity: 0; } 6.25% { opacity: 1; } 12.49% { opacity: 1; } 12.50% { opacity: 0; } 43.74% { opacity: 0; } 43.75% { opacity: 1; } 49.99% { opacity: 1; } 50.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000000001000001 { 0% { opacity: 0; } 56.24% { opacity: 0; } 56.25% { opacity: 1; } 62.49% { opacity: 1; } 62.50% { opacity: 0; } 93.74% { opacity: 0; } 93.75% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0000000001100011 { 0% { opacity: 0; } 56.24% { opacity: 0; } 56.25% { opacity: 1; } 68.74% { opacity: 1; } 68.75% { opacity: 0; } 87.49% { opacity: 0; } 87.50% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0000000000110110 { 0% { opacity: 0; } 62.49% { opacity: 0; } 62.50% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 81.24% { opacity: 0; } 81.25% { opacity: 1; } 93.74% { opacity: 1; } 93.75% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle cx="9" cy="3" r="2" />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={0} style={{ animation: 'f0000100000000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={0} style={{ animation: 'f0000000000001000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="3" r="2" />
      <circle cx="39" cy="3" r="2" />
      <circle cx="3" cy="9" r="2" />
      <circle cx="9" cy="9" r="2" />
      <circle className="on" cx="9" cy="9" r="2" opacity={0} style={{ animation: 'f0000100000000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'f0001010000000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f0000000000010100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle className="on" cx="33" cy="9" r="2" opacity={0} style={{ animation: 'f0000000000001000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="9" r="2" />
      <circle cx="3" cy="15" r="2" />
      <circle className="on" cx="3" cy="15" r="2" opacity={0} style={{ animation: 'f0000100000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={0} style={{ animation: 'f0001010000000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'f0010001000000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f0000000000100010 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f0000000000010100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle className="on" cx="39" cy="15" r="2" opacity={0} style={{ animation: 'f0000000000001000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="21" r="2" />
      <circle className="on" cx="3" cy="21" r="2" opacity={0} style={{ animation: 'f0011011000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f0110001100000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'f0100000100000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f0000000001000001 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f0000000001100011 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle className="on" cx="39" cy="21" r="2" opacity={0} style={{ animation: 'f0000000000110110 var(--dur) linear infinite' }} />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={0} style={{ animation: 'f0011011000000000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'f0110001100000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f0000000001100011 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle className="on" cx="39" cy="27" r="2" opacity={0} style={{ animation: 'f0000000000110110 var(--dur) linear infinite' }} />
      <circle cx="3" cy="33" r="2" />
      <circle cx="9" cy="33" r="2" />
      <circle cx="15" cy="33" r="2" />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" />
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