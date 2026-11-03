import { useId } from 'react';

// Draws a perfume bottle from a product's "look" (shape + colours). Pure SVG, no image files.
const SHAPES = {
  tall: {
    glass: 'M60 82 Q60 72 70 72 H130 Q140 72 140 82 V232 Q140 244 128 244 H72 Q60 244 60 232 Z',
    liquid: 'M66 120 H134 V230 Q134 238 126 238 H74 Q66 238 66 230 Z',
    neck: [90, 60, 20, 14],
    cap: 'M80 22 Q80 16 86 16 H114 Q120 16 120 22 V60 H80 Z',
    label: [72, 150, 56, 52],
  },
  round: {
    glass: 'M100 86 C150 86 170 122 170 162 C170 210 140 240 100 240 C60 240 30 210 30 162 C30 122 50 86 100 86 Z',
    liquid: 'M38 160 H162 C162 205 136 232 100 232 C64 232 38 205 38 160 Z',
    neck: [88, 70, 24, 18],
    cap: 'M76 30 Q76 22 84 22 H116 Q124 22 124 30 V70 H76 Z',
    label: [66, 148, 68, 40],
  },
  square: {
    glass: 'M44 92 Q44 84 52 84 H148 Q156 84 156 92 V234 Q156 242 148 242 H52 Q44 242 44 234 Z',
    liquid: 'M54 122 H146 V226 Q146 232 140 232 H60 Q54 232 54 226 Z',
    neck: [88, 72, 24, 12],
    cap: 'M68 28 H132 V72 H68 Z',
    label: [64, 146, 72, 50],
  },
  flacon: {
    glass: 'M70 84 H130 Q160 120 160 170 Q160 238 100 242 Q40 238 40 170 Q40 120 70 84 Z',
    liquid: 'M48 150 H152 Q154 160 154 172 Q154 230 100 234 Q46 230 46 172 Q46 160 48 150 Z',
    neck: [88, 70, 24, 14],
    cap: 'M100 14 L126 36 L120 70 H80 L74 36 Z',
    label: [68, 160, 64, 40],
  },
  attar: {
    glass: 'M100 120 C138 120 150 150 150 182 C150 220 128 242 100 242 C72 242 50 220 50 182 C50 150 62 120 100 120 Z',
    liquid: 'M56 178 H144 C144 214 126 234 100 234 C74 234 56 214 56 178 Z',
    neck: [90, 104, 20, 16],
    cap: 'M100 18 C118 40 122 64 112 86 C108 96 104 104 100 104 C96 104 92 96 88 86 C78 64 82 40 100 18 Z',
    label: [70, 170, 60, 34],
  },
};

export default function Bottle({ look = {}, name = '', size = 260, showLabel = true, className = '' }) {
  const id = useId().replace(/:/g, '');
  const shape = SHAPES[look.shape] || SHAPES.tall;
  const liquid = look.liquid || '#c9a25f';
  const cap = look.cap || '#1b1714';
  const accent = look.accent || '#f3e7d3';
  const [nx, ny, nw, nh] = shape.neck;
  const [lx, ly, lw, lh] = shape.label;
  const isGoldCap = /^#(c9|b0|d4|e0)/i.test(cap);

  return (
    <svg
      viewBox="0 0 200 270"
      width={size}
      height={(size * 270) / 200}
      className={className}
      role="img"
      aria-label={name ? `${name} perfume bottle` : 'Perfume bottle'}
    >
      <defs>
        <linearGradient id={`liq${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={liquid} stopOpacity="0.75" />
          <stop offset="1" stopColor={liquid} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`glass${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor={accent} stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`cap${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={cap} />
          <stop offset="0.45" stopColor={isGoldCap ? '#f3dfae' : '#5a4f47'} stopOpacity={isGoldCap ? 1 : 0.7} />
          <stop offset="1" stopColor={cap} />
        </linearGradient>
        <radialGradient id={`shadow${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="252" rx="78" ry="10" fill={`url(#shadow${id})`} />
      <path d={shape.cap} fill={`url(#cap${id})`} />
      <rect x={nx} y={ny} width={nw} height={nh} rx="2" fill={isGoldCap ? '#a8844d' : '#2b2420'} />
      <path d={shape.glass} fill={`url(#glass${id})`} stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" />
      <path d={shape.liquid} fill={`url(#liq${id})`} />
      <path d={shape.glass} fill="none" stroke="#3b302a" strokeOpacity="0.18" strokeWidth="1" />
      {/* highlight */}
      <path d={`M${lx - 6} ${ny + nh + 18} q-4 50 0 120`} stroke="#fff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" fill="none" />
      {showLabel && (
        <g>
          <rect x={lx} y={ly} width={lw} height={lh} rx="2" fill={accent} fillOpacity="0.92" stroke="#b08d57" strokeWidth="0.8" />
          <text x={lx + lw / 2} y={ly + lh * 0.45} textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif" fontSize="11" letterSpacing="2.5" fill="#15110e">
            PRAMAS
          </text>
          <line x1={lx + lw * 0.3} x2={lx + lw * 0.7} y1={ly + lh * 0.58} y2={ly + lh * 0.58} stroke="#b08d57" strokeWidth="0.6" />
          <text x={lx + lw / 2} y={ly + lh * 0.82} textAnchor="middle" fontFamily="Jost, Arial, sans-serif" fontSize={name.length > 12 ? 5 : 6} letterSpacing="1" fill="#4a3f37">
            {name.toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );
}
