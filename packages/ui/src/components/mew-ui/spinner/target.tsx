import type { CSSProperties } from 'react';

export function SpinnerTarget({ size = 28 }: { size?: number }) {
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
        @keyframes f000000000010000 { 0% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 73.32% { opacity: 1; } 73.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f100000000010000 { 0% { opacity: 1; } 6.66% { opacity: 1; } 6.67% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 73.32% { opacity: 1; } 73.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f110000000100001 { 0% { opacity: 1; } 13.32% { opacity: 1; } 13.33% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 93.32% { opacity: 0; } 93.33% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111100001100000 { 0% { opacity: 1; } 26.66% { opacity: 1; } 26.67% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011100000100000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 26.66% { opacity: 1; } 26.67% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001100000010000 { 0% { opacity: 0; } 13.32% { opacity: 0; } 13.33% { opacity: 1; } 26.66% { opacity: 1; } 26.67% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 73.32% { opacity: 1; } 73.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f010000000100000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 13.32% { opacity: 1; } 13.33% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f101100011100011 { 0% { opacity: 1; } 6.66% { opacity: 1; } 6.67% { opacity: 0; } 13.32% { opacity: 0; } 13.33% { opacity: 1; } 26.66% { opacity: 1; } 26.67% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 86.66% { opacity: 0; } 86.67% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f010010011000000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 13.32% { opacity: 1; } 13.33% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f101110011100000 { 0% { opacity: 1; } 6.66% { opacity: 1; } 6.67% { opacity: 0; } 13.32% { opacity: 0; } 13.33% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f010010000100000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 13.32% { opacity: 1; } 13.33% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f100000000100001 { 0% { opacity: 1; } 6.66% { opacity: 1; } 6.67% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 93.32% { opacity: 0; } 93.33% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f110000011100011 { 0% { opacity: 1; } 13.32% { opacity: 1; } 13.33% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 86.66% { opacity: 0; } 86.67% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111110001000111 { 0% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 79.99% { opacity: 0; } 80.00% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111101110000011 { 0% { opacity: 1; } 26.66% { opacity: 1; } 26.67% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 53.32% { opacity: 1; } 53.33% { opacity: 0; } 86.66% { opacity: 0; } 86.67% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111111101000001 { 0% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 93.32% { opacity: 0; } 93.33% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f011101111100000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 26.66% { opacity: 1; } 26.67% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001110000100000 { 0% { opacity: 0; } 13.32% { opacity: 0; } 13.33% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f100000001100000 { 0% { opacity: 1; } 6.66% { opacity: 1; } 6.67% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f010000011000000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 13.32% { opacity: 1; } 13.33% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f101111110000011 { 0% { opacity: 1; } 6.66% { opacity: 1; } 6.67% { opacity: 0; } 13.32% { opacity: 0; } 13.33% { opacity: 1; } 53.32% { opacity: 1; } 53.33% { opacity: 0; } 86.66% { opacity: 0; } 86.67% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f010010010000000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 13.32% { opacity: 1; } 13.33% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 53.32% { opacity: 1; } 53.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f101111110000000 { 0% { opacity: 1; } 6.66% { opacity: 1; } 6.67% { opacity: 0; } 13.32% { opacity: 0; } 13.33% { opacity: 1; } 53.32% { opacity: 1; } 53.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001111101100000 { 0% { opacity: 0; } 13.32% { opacity: 0; } 13.33% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000000000100000 { 0% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f100000011100000 { 0% { opacity: 1; } 6.66% { opacity: 1; } 6.67% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f110011101000001 { 0% { opacity: 1; } 13.32% { opacity: 1; } 13.33% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 93.32% { opacity: 0; } 93.33% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111101110000000 { 0% { opacity: 1; } 26.66% { opacity: 1; } 26.67% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 53.32% { opacity: 1; } 53.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011111101000000 { 0% { opacity: 0; } 6.66% { opacity: 0; } 6.67% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f001101111100000 { 0% { opacity: 0; } 13.32% { opacity: 0; } 13.33% { opacity: 1; } 26.66% { opacity: 1; } 26.67% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000011100100000 { 0% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001111100000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000010011000000 { 0% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 46.66% { opacity: 0; } 46.67% { opacity: 1; } 59.99% { opacity: 1; } 60.00% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000011111100000 { 0% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000010000100000 { 0% { opacity: 0; } 26.66% { opacity: 0; } 26.67% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001100010000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 73.32% { opacity: 1; } 73.33% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001101100000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 53.32% { opacity: 0; } 53.33% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f000001100100000 { 0% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 46.66% { opacity: 1; } 46.67% { opacity: 0; } 59.99% { opacity: 0; } 60.00% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 100% { opacity: 0; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle className="on" cx="3" cy="3" r="2" opacity={0} style={{ animation: 'f000000000010000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="3" r="2" />
      <circle className="on" cx="9" cy="3" r="2" opacity={1} style={{ animation: 'f100000000010000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={1} style={{ animation: 'f110000000100001 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" opacity={1} style={{ animation: 'f111100001100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={0} style={{ animation: 'f011100000100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="3" r="2" />
      <circle className="on" cx="33" cy="3" r="2" opacity={0} style={{ animation: 'f001100000010000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="3" r="2" />
      <circle className="on" cx="39" cy="3" r="2" opacity={0} style={{ animation: 'f000000000010000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="9" r="2" />
      <circle className="on" cx="3" cy="9" r="2" opacity={1} style={{ animation: 'f100000000010000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="9" r="2" />
      <circle className="on" cx="9" cy="9" r="2" opacity={0} style={{ animation: 'f010000000100000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={1} style={{ animation: 'f101100011100011 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={0} style={{ animation: 'f010010011000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={1} style={{ animation: 'f101110011100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle className="on" cx="33" cy="9" r="2" opacity={0} style={{ animation: 'f010010000100000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="9" r="2" />
      <circle className="on" cx="39" cy="9" r="2" opacity={0} style={{ animation: 'f001100000010000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="15" r="2" />
      <circle className="on" cx="3" cy="15" r="2" opacity={1} style={{ animation: 'f100000000100001 var(--dur) linear infinite' }} />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={1} style={{ animation: 'f110000011100011 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={1} style={{ animation: 'f111110001000111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={1} style={{ animation: 'f111101110000011 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={1} style={{ animation: 'f111111101000001 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={0} style={{ animation: 'f011101111100000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle className="on" cx="39" cy="15" r="2" opacity={0} style={{ animation: 'f001110000100000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="21" r="2" />
      <circle className="on" cx="3" cy="21" r="2" opacity={1} style={{ animation: 'f100000001100000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={0} style={{ animation: 'f010000011000000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={1} style={{ animation: 'f101111110000011 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={0} style={{ animation: 'f010010010000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={1} style={{ animation: 'f101111110000000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={0} style={{ animation: 'f010010011000000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle className="on" cx="39" cy="21" r="2" opacity={0} style={{ animation: 'f001111101100000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={0} style={{ animation: 'f000000000100000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={1} style={{ animation: 'f100000011100000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={1} style={{ animation: 'f110011101000001 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={1} style={{ animation: 'f111101110000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={0} style={{ animation: 'f011111101000000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={0} style={{ animation: 'f001101111100000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle className="on" cx="39" cy="27" r="2" opacity={0} style={{ animation: 'f000011100100000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="33" r="2" />
      <circle className="on" cx="3" cy="33" r="2" opacity={0} style={{ animation: 'f000000000010000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="33" r="2" />
      <circle className="on" cx="9" cy="33" r="2" opacity={0} style={{ animation: 'f000000000100000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f000001111100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={0} style={{ animation: 'f000010011000000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f000011111100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="33" r="2" />
      <circle className="on" cx="33" cy="33" r="2" opacity={0} style={{ animation: 'f000010000100000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="33" r="2" />
      <circle className="on" cx="39" cy="33" r="2" opacity={0} style={{ animation: 'f000001100010000 var(--dur) linear infinite' }} />
      <circle cx="3" cy="39" r="2" />
      <circle className="on" cx="3" cy="39" r="2" opacity={0} style={{ animation: 'f000000000010000 var(--dur) linear infinite' }} />
      <circle cx="9" cy="39" r="2" />
      <circle className="on" cx="9" cy="39" r="2" opacity={0} style={{ animation: 'f000000000010000 var(--dur) linear infinite' }} />
      <circle cx="15" cy="39" r="2" />
      <circle className="on" cx="15" cy="39" r="2" opacity={0} style={{ animation: 'f000000000100000 var(--dur) linear infinite' }} />
      <circle cx="21" cy="39" r="2" />
      <circle className="on" cx="21" cy="39" r="2" opacity={0} style={{ animation: 'f000001101100000 var(--dur) linear infinite' }} />
      <circle cx="27" cy="39" r="2" />
      <circle className="on" cx="27" cy="39" r="2" opacity={0} style={{ animation: 'f000001100100000 var(--dur) linear infinite' }} />
      <circle cx="33" cy="39" r="2" />
      <circle className="on" cx="33" cy="39" r="2" opacity={0} style={{ animation: 'f000001100010000 var(--dur) linear infinite' }} />
      <circle cx="39" cy="39" r="2" />
      <circle className="on" cx="39" cy="39" r="2" opacity={0} style={{ animation: 'f000000000010000 var(--dur) linear infinite' }} />
    </svg>
  );
}