import type { CSSProperties } from 'react';

export function SpinnerSyncing({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '2.700s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f100000000000000100 { 0% { opacity: 1; } 5.55% { opacity: 1; } 5.56% { opacity: 0; } 83.32% { opacity: 0; } 83.33% { opacity: 1; } 88.88% { opacity: 1; } 88.89% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f111000000000001110 { 0% { opacity: 1; } 16.66% { opacity: 1; } 16.67% { opacity: 0; } 77.77% { opacity: 0; } 77.78% { opacity: 1; } 94.43% { opacity: 1; } 94.44% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f010000000000001000 { 0% { opacity: 0; } 5.55% { opacity: 0; } 5.56% { opacity: 1; } 11.10% { opacity: 1; } 11.11% { opacity: 0; } 77.77% { opacity: 0; } 77.78% { opacity: 1; } 83.32% { opacity: 1; } 83.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f111100000000011110 { 0% { opacity: 1; } 22.21% { opacity: 1; } 22.22% { opacity: 0; } 72.21% { opacity: 0; } 72.22% { opacity: 1; } 94.43% { opacity: 1; } 94.44% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001000000000010000 { 0% { opacity: 0; } 11.10% { opacity: 0; } 11.11% { opacity: 1; } 16.66% { opacity: 1; } 16.67% { opacity: 0; } 72.21% { opacity: 0; } 72.22% { opacity: 1; } 77.77% { opacity: 1; } 77.78% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011110000000111100 { 0% { opacity: 0; } 5.55% { opacity: 0; } 5.56% { opacity: 1; } 27.77% { opacity: 1; } 27.78% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 88.88% { opacity: 1; } 88.89% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000100000000100000 { 0% { opacity: 0; } 16.66% { opacity: 0; } 16.67% { opacity: 1; } 22.21% { opacity: 1; } 22.22% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 72.21% { opacity: 1; } 72.22% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001111000001111000 { 0% { opacity: 0; } 11.10% { opacity: 0; } 11.11% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 61.10% { opacity: 0; } 61.11% { opacity: 1; } 83.32% { opacity: 1; } 83.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000010000001000000 { 0% { opacity: 0; } 22.21% { opacity: 0; } 22.22% { opacity: 1; } 27.77% { opacity: 1; } 27.78% { opacity: 0; } 61.10% { opacity: 0; } 61.11% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000111100011110000 { 0% { opacity: 0; } 16.66% { opacity: 0; } 16.67% { opacity: 1; } 38.88% { opacity: 1; } 38.89% { opacity: 0; } 55.55% { opacity: 0; } 55.56% { opacity: 1; } 77.77% { opacity: 1; } 77.78% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001000010000000 { 0% { opacity: 0; } 27.77% { opacity: 0; } 27.78% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 55.55% { opacity: 0; } 55.56% { opacity: 1; } 61.10% { opacity: 1; } 61.11% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000011110111100000 { 0% { opacity: 0; } 22.21% { opacity: 0; } 22.22% { opacity: 1; } 44.43% { opacity: 1; } 44.44% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 72.21% { opacity: 1; } 72.22% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000100100000000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 38.88% { opacity: 1; } 38.89% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 55.55% { opacity: 1; } 55.56% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001110111000000 { 0% { opacity: 0; } 27.77% { opacity: 0; } 27.78% { opacity: 1; } 44.43% { opacity: 1; } 44.44% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle cx="9" cy="3" r="2" />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={1} style={{ animation: 'f100000000000000100 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" opacity={1} style={{ animation: 'f111000000000001110 var(--dur) linear infinite' }} />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={1} style={{ animation: 'f100000000000000100 var(--dur) linear infinite' }} />
      <circle cx="33" cy="3" r="2" />
      <circle cx="39" cy="3" r="2" />
      <circle cx="3" cy="9" r="2" />
      <circle cx="9" cy="9" r="2" />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={0} style={{ animation: 'f010000000000001000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={1} style={{ animation: 'f111100000000011110 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f010000000000001000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle cx="39" cy="9" r="2" />
      <circle cx="3" cy="15" r="2" />
      <circle cx="9" cy="15" r="2" />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={0} style={{ animation: 'f001000000000010000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={0} style={{ animation: 'f011110000000111100 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f001000000000010000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle cx="39" cy="15" r="2" />
      <circle cx="3" cy="21" r="2" />
      <circle cx="9" cy="21" r="2" />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={0} style={{ animation: 'f000100000000100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f001111000001111000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f000100000000100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle cx="39" cy="21" r="2" />
      <circle cx="3" cy="27" r="2" />
      <circle cx="9" cy="27" r="2" />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={0} style={{ animation: 'f000010000001000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={0} style={{ animation: 'f000111100011110000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f000010000001000000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle cx="39" cy="27" r="2" />
      <circle cx="3" cy="33" r="2" />
      <circle cx="9" cy="33" r="2" />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f000001000010000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={0} style={{ animation: 'f000011110111100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f000001000010000000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="33" r="2" />
      <circle cx="39" cy="33" r="2" />
      <circle cx="3" cy="39" r="2" />
      <circle cx="9" cy="39" r="2" />
      <circle cx="15" cy="39" r="2" />
      <circle className="on" cx="15" cy="39" r="2" opacity={0} style={{ animation: 'f000000100100000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="39" r="2" />
      <circle className="on" cx="21" cy="39" r="2" opacity={0} style={{ animation: 'f000001110111000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="39" r="2" />
      <circle className="on" cx="27" cy="39" r="2" opacity={0} style={{ animation: 'f000000100100000000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="39" r="2" />
      <circle cx="39" cy="39" r="2" />
    </svg>
  );
}