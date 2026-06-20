import type { CSSProperties } from 'react';

export function SpinnerRipple({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '1.350s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f000001110 { 0% { opacity: 0; } 55.55% { opacity: 0; } 55.56% { opacity: 1; } 88.88% { opacity: 1; } 88.89% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000011010 { 0% { opacity: 0; } 44.43% { opacity: 0; } 44.44% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 77.77% { opacity: 0; } 77.78% { opacity: 1; } 88.88% { opacity: 1; } 88.89% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000110100 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 55.55% { opacity: 1; } 55.56% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 77.77% { opacity: 1; } 77.78% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000101000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 44.43% { opacity: 1; } 44.44% { opacity: 0; } 55.55% { opacity: 0; } 55.56% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001010000 { 0% { opacity: 0; } 22.21% { opacity: 0; } 22.22% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 44.43% { opacity: 0; } 44.44% { opacity: 1; } 55.55% { opacity: 1; } 55.56% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f010100000 { 0% { opacity: 0; } 11.10% { opacity: 0; } 11.11% { opacity: 1; } 22.21% { opacity: 1; } 22.22% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 44.43% { opacity: 1; } 44.44% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f111000000 { 0% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle className="on" cx="3" cy="3" r="2" opacity={0} style={{ animation: 'f000001110 var(--dur) linear infinite' }} />
      <circle cx="9" cy="3" r="2" />
      <circle className="on" cx="9" cy="3" r="2" opacity={0} style={{ animation: 'f000011010 var(--dur) linear infinite' }} />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="3" r="2" />
      <circle className="on" cx="33" cy="3" r="2" opacity={0} style={{ animation: 'f000011010 var(--dur) linear infinite' }} />
      <circle cx="39" cy="3" r="2" />
      <circle className="on" cx="39" cy="3" r="2" opacity={0} style={{ animation: 'f000001110 var(--dur) linear infinite' }} />
      <circle cx="3" cy="9" r="2" />
      <circle className="on" cx="3" cy="9" r="2" opacity={0} style={{ animation: 'f000011010 var(--dur) linear infinite' }} />
      <circle cx="9" cy="9" r="2" />
      <circle className="on" cx="9" cy="9" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'f001010000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle className="on" cx="33" cy="9" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="9" r="2" />
      <circle className="on" cx="39" cy="9" r="2" opacity={0} style={{ animation: 'f000011010 var(--dur) linear infinite' }} />
      <circle cx="3" cy="15" r="2" />
      <circle className="on" cx="3" cy="15" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'f001010000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'f010100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f001010000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle className="on" cx="39" cy="15" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="3" cy="21" r="2" />
      <circle className="on" cx="3" cy="21" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f001010000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'f010100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={1} style={{ animation: 'f111000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f010100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f001010000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle className="on" cx="39" cy="21" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={0} style={{ animation: 'f001010000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={0} style={{ animation: 'f010100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f001010000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle className="on" cx="39" cy="27" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="3" cy="33" r="2" />
      <circle className="on" cx="3" cy="33" r="2" opacity={0} style={{ animation: 'f000011010 var(--dur) linear infinite' }} />
      <circle cx="9" cy="33" r="2" />
      <circle className="on" cx="9" cy="33" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={0} style={{ animation: 'f001010000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="33" r="2" />
      <circle className="on" cx="33" cy="33" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="39" cy="33" r="2" />
      <circle className="on" cx="39" cy="33" r="2" opacity={0} style={{ animation: 'f000011010 var(--dur) linear infinite' }} />
      <circle cx="3" cy="39" r="2" />
      <circle className="on" cx="3" cy="39" r="2" opacity={0} style={{ animation: 'f000001110 var(--dur) linear infinite' }} />
      <circle cx="9" cy="39" r="2" />
      <circle className="on" cx="9" cy="39" r="2" opacity={0} style={{ animation: 'f000011010 var(--dur) linear infinite' }} />
      <circle cx="15" cy="39" r="2" />
      <circle className="on" cx="15" cy="39" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="39" r="2" />
      <circle className="on" cx="21" cy="39" r="2" opacity={0} style={{ animation: 'f000101000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="39" r="2" />
      <circle className="on" cx="27" cy="39" r="2" opacity={0} style={{ animation: 'f000110100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="39" r="2" />
      <circle className="on" cx="33" cy="39" r="2" opacity={0} style={{ animation: 'f000011010 var(--dur) linear infinite' }} />
      <circle cx="39" cy="39" r="2" />
      <circle className="on" cx="39" cy="39" r="2" opacity={0} style={{ animation: 'f000001110 var(--dur) linear infinite' }} />
    </svg>
  );
}