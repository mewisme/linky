import type { CSSProperties } from 'react';

export function SpinnerSearching({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      style={{ '--on': '#F5F5F5', '--off': '#404040', '--dur': '1.500s' } as CSSProperties}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f0000000111 { 0% { opacity: 0; } 69.99% { opacity: 0; } 70.00% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f1000000111 { 0% { opacity: 1; } 9.99% { opacity: 1; } 10.00% { opacity: 0; } 69.99% { opacity: 0; } 70.00% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0100000111 { 0% { opacity: 0; } 9.99% { opacity: 0; } 10.00% { opacity: 1; } 19.99% { opacity: 1; } 20.00% { opacity: 0; } 69.99% { opacity: 0; } 70.00% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0010000000 { 0% { opacity: 0; } 19.99% { opacity: 0; } 20.00% { opacity: 1; } 29.99% { opacity: 1; } 30.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f1100000000 { 0% { opacity: 1; } 19.99% { opacity: 1; } 20.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f1110000111 { 0% { opacity: 1; } 29.99% { opacity: 1; } 30.00% { opacity: 0; } 69.99% { opacity: 0; } 70.00% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0111000000 { 0% { opacity: 0; } 9.99% { opacity: 0; } 10.00% { opacity: 1; } 39.99% { opacity: 1; } 40.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f1000001111 { 0% { opacity: 1; } 9.99% { opacity: 1; } 10.00% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0101010111 { 0% { opacity: 0; } 9.99% { opacity: 0; } 10.00% { opacity: 1; } 19.99% { opacity: 1; } 20.00% { opacity: 0; } 29.99% { opacity: 0; } 30.00% { opacity: 1; } 39.99% { opacity: 1; } 40.00% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 69.99% { opacity: 0; } 70.00% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f0011100000 { 0% { opacity: 0; } 19.99% { opacity: 0; } 20.00% { opacity: 1; } 49.99% { opacity: 1; } 50.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0001000000 { 0% { opacity: 0; } 29.99% { opacity: 0; } 30.00% { opacity: 1; } 39.99% { opacity: 1; } 40.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000001000 { 0% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 69.99% { opacity: 1; } 70.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000011000 { 0% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 69.99% { opacity: 1; } 70.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000111000 { 0% { opacity: 0; } 39.99% { opacity: 0; } 40.00% { opacity: 1; } 69.99% { opacity: 1; } 70.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0001110000 { 0% { opacity: 0; } 29.99% { opacity: 0; } 30.00% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000100000 { 0% { opacity: 0; } 39.99% { opacity: 0; } 40.00% { opacity: 1; } 49.99% { opacity: 1; } 50.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f0000010000 { 0% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
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
      <circle className="on" cx="9" cy="9" r="2" opacity={0} style={{ animation: 'f0000000111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={1} style={{ animation: 'f1000000111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'f0100000111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={0} style={{ animation: 'f0010000000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle cx="39" cy="9" r="2" />
      <circle cx="3" cy="15" r="2" />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={1} style={{ animation: 'f1000000111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={1} style={{ animation: 'f1100000000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={1} style={{ animation: 'f1110000111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={0} style={{ animation: 'f0111000000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f0010000000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle cx="3" cy="21" r="2" />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f0000000111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={1} style={{ animation: 'f1000001111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f0101010111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={0} style={{ animation: 'f0011100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f0001000000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle cx="3" cy="27" r="2" />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={0} style={{ animation: 'f0000001000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={0} style={{ animation: 'f0000011000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={0} style={{ animation: 'f0000111000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f0001110000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f0000100000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle cx="3" cy="33" r="2" />
      <circle cx="9" cy="33" r="2" />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f0000001000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={0} style={{ animation: 'f0000010000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f0000100000 var(--dur) linear infinite' }} />
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