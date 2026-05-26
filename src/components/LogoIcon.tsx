interface LogoIconProps {
  size?: number;
  white?: boolean;
}

export default function LogoIcon({ size = 30, white = false }: LogoIconProps) {
  const dot  = white ? '#fff' : '#3B9FDF';
  const hook = white ? '#fff' : '#3DCFC0';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Oval dots — diagonal spray, large bottom-left → small top-right */}

      {/* Column 1 — largest */}
      <ellipse cx="10" cy="80" rx="7"   ry="4.5" transform="rotate(-40 10 80)"  fill={dot} />
      <ellipse cx="10" cy="62" rx="7"   ry="4.5" transform="rotate(-40 10 62)"  fill={dot} />
      <ellipse cx="10" cy="44" rx="7"   ry="4.5" transform="rotate(-40 10 44)"  fill={dot} />

      {/* Column 2 */}
      <ellipse cx="27" cy="74" rx="6"   ry="4"   transform="rotate(-40 27 74)"  fill={dot} />
      <ellipse cx="27" cy="56" rx="6"   ry="4"   transform="rotate(-40 27 56)"  fill={dot} />
      <ellipse cx="27" cy="38" rx="6"   ry="4"   transform="rotate(-40 27 38)"  fill={dot} />
      <ellipse cx="27" cy="20" rx="6"   ry="4"   transform="rotate(-40 27 20)"  fill={dot} />

      {/* Column 3 */}
      <ellipse cx="44" cy="65" rx="5"   ry="3.5" transform="rotate(-40 44 65)"  fill={dot} />
      <ellipse cx="44" cy="47" rx="5"   ry="3.5" transform="rotate(-40 44 47)"  fill={dot} />
      <ellipse cx="44" cy="29" rx="5"   ry="3.5" transform="rotate(-40 44 29)"  fill={dot} />
      <ellipse cx="44" cy="11" rx="5"   ry="3.5" transform="rotate(-40 44 11)"  fill={dot} />

      {/* Column 4 */}
      <ellipse cx="61" cy="53" rx="4"   ry="3"   transform="rotate(-40 61 53)"  fill={dot} />
      <ellipse cx="61" cy="35" rx="4"   ry="3"   transform="rotate(-40 61 35)"  fill={dot} />
      <ellipse cx="61" cy="17" rx="4"   ry="3"   transform="rotate(-40 61 17)"  fill={dot} />

      {/* Column 5 — smallest */}
      <ellipse cx="78" cy="40" rx="3"   ry="2.5" transform="rotate(-40 78 40)"  fill={dot} />
      <ellipse cx="78" cy="22" rx="3"   ry="2.5" transform="rotate(-40 78 22)"  fill={dot} />

      {/*
        Solid filled C/hook — lower-right, opening toward upper-left.
        Center (72, 74), outer r=20, inner r=12.
        Outer arc: top (72,54) → clockwise 270° → left (52,74).
        Inner arc: (60,74) → counterclockwise 270° → (72,62).
      */}
      <path
        d="M 72 54 A 20 20 0 1 1 52 74 L 60 74 A 12 12 0 1 0 72 62 Z"
        fill={hook}
      />
    </svg>
  );
}
