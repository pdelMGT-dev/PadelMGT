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
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Teal J-hook — lower portion */}
      <path
        className="logo-hook"
        d="M23 26 C23 31 16 32 11 28 C7 24 8 17 12 14"
        stroke={hook}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Blue dots — upper spray pattern */}
      <circle className="logo-dot" cx="17" cy="10" r="2.5" fill={dot}/>
      <circle className="logo-dot" cx="23" cy="8"  r="2.2" fill={dot}/>
      <circle className="logo-dot" cx="11" cy="9"  r="2.0" fill={dot}/>
      <circle className="logo-dot" cx="27" cy="14" r="1.8" fill={dot}/>
      <circle className="logo-dot" cx="19" cy="4"  r="1.8" fill={dot}/>
      <circle className="logo-dot" cx="7"  cy="13" r="1.6" fill={dot}/>
      <circle className="logo-dot" cx="29" cy="8"  r="1.5" fill={dot}/>
      <circle className="logo-dot" cx="14" cy="4"  r="1.4" fill={dot}/>
      <circle className="logo-dot" cx="25" cy="3"  r="1.3" fill={dot}/>
      <circle className="logo-dot" cx="5"  cy="7"  r="1.2" fill={dot}/>
      <circle className="logo-dot" cx="10" cy="2"  r="1.1" fill={dot}/>
      <circle className="logo-dot" cx="4"  cy="18" r="0.9" fill={dot}/>
    </svg>
  );
}
