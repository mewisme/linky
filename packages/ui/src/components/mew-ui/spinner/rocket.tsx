import type { CSSProperties } from 'react';

export function SpinnerRocket({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '1.650s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f00000011111 { 0% { opacity: 0; } 54.54% { opacity: 0; } 54.55% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f00000111110 { 0% { opacity: 0; } 45.44% { opacity: 0; } 45.45% { opacity: 1; } 90.90% { opacity: 1; } 90.91% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00000111100 { 0% { opacity: 0; } 45.44% { opacity: 0; } 45.45% { opacity: 1; } 81.81% { opacity: 1; } 81.82% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00001111111 { 0% { opacity: 0; } 36.35% { opacity: 0; } 36.36% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f00001111100 { 0% { opacity: 0; } 36.35% { opacity: 0; } 36.36% { opacity: 1; } 81.81% { opacity: 1; } 81.82% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00011111000 { 0% { opacity: 0; } 27.26% { opacity: 0; } 27.27% { opacity: 1; } 72.72% { opacity: 1; } 72.73% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00001111110 { 0% { opacity: 0; } 36.35% { opacity: 0; } 36.36% { opacity: 1; } 90.90% { opacity: 1; } 90.91% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00011110000 { 0% { opacity: 0; } 27.26% { opacity: 0; } 27.27% { opacity: 1; } 63.63% { opacity: 1; } 63.64% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00111111000 { 0% { opacity: 0; } 18.17% { opacity: 0; } 18.18% { opacity: 1; } 72.72% { opacity: 1; } 72.73% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00111100100 { 0% { opacity: 0; } 18.17% { opacity: 0; } 18.18% { opacity: 1; } 54.54% { opacity: 1; } 54.55% { opacity: 0; } 72.72% { opacity: 0; } 72.73% { opacity: 1; } 81.81% { opacity: 1; } 81.82% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00111110000 { 0% { opacity: 0; } 18.17% { opacity: 0; } 18.18% { opacity: 1; } 63.63% { opacity: 1; } 63.64% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00111000000 { 0% { opacity: 0; } 18.17% { opacity: 0; } 18.18% { opacity: 1; } 45.44% { opacity: 1; } 45.45% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f01110100000 { 0% { opacity: 0; } 9.08% { opacity: 0; } 9.09% { opacity: 1; } 36.35% { opacity: 1; } 36.36% { opacity: 0; } 45.44% { opacity: 0; } 45.45% { opacity: 1; } 54.54% { opacity: 1; } 54.55% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f00111001000 { 0% { opacity: 0; } 18.17% { opacity: 0; } 18.18% { opacity: 1; } 45.44% { opacity: 1; } 45.45% { opacity: 0; } 63.63% { opacity: 0; } 63.64% { opacity: 1; } 72.72% { opacity: 1; } 72.73% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f01100000000 { 0% { opacity: 0; } 9.08% { opacity: 0; } 9.09% { opacity: 1; } 27.26% { opacity: 1; } 27.27% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f01110000000 { 0% { opacity: 0; } 9.08% { opacity: 0; } 9.09% { opacity: 1; } 36.35% { opacity: 1; } 36.36% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle cx="9" cy="3" r="2" />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={0} style={{ animation: 'f00000011111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" opacity={0} style={{ animation: 'f00000111110 var(--dur) linear infinite' }} />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={0} style={{ animation: 'f00000011111 var(--dur) linear infinite' }} />
      <circle cx="33" cy="3" r="2" />
      <circle cx="39" cy="3" r="2" />
      <circle cx="3" cy="9" r="2" />
      <circle cx="9" cy="9" r="2" />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'f00000111100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'f00001111111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f00000111100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle cx="39" cy="9" r="2" />
      <circle cx="3" cy="15" r="2" />
      <circle cx="9" cy="15" r="2" />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'f00001111100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'f00011111000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f00001111110 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle cx="39" cy="15" r="2" />
      <circle cx="3" cy="21" r="2" />
      <circle cx="9" cy="21" r="2" />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'f00011110000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f00111111000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f00011110000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle cx="39" cy="21" r="2" />
      <circle cx="3" cy="27" r="2" />
      <circle cx="9" cy="27" r="2" />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={0} style={{ animation: 'f00111111000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={0} style={{ animation: 'f00111100100 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f00111110000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle cx="39" cy="27" r="2" />
      <circle cx="3" cy="33" r="2" />
      <circle cx="9" cy="33" r="2" />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f00111000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={0} style={{ animation: 'f01110100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f00111001000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="33" r="2" />
      <circle cx="39" cy="33" r="2" />
      <circle cx="3" cy="39" r="2" />
      <circle cx="9" cy="39" r="2" />
      <circle cx="15" cy="39" r="2" />
      <circle className="on" cx="15" cy="39" r="2" opacity={0} style={{ animation: 'f01100000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="39" r="2" />
      <circle className="on" cx="21" cy="39" r="2" opacity={0} style={{ animation: 'f01110000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="39" r="2" />
      <circle className="on" cx="27" cy="39" r="2" opacity={0} style={{ animation: 'f01100000000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="39" r="2" />
      <circle cx="39" cy="39" r="2" />
    </svg>
  );
}