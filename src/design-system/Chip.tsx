import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  active?: boolean;
  children: ReactNode;
};

/** Small toggleable pill, used for filters. Wraps the real `.chip` class from globals.css. */
export function Chip({ active, children, ...rest }: ChipProps) {
  return (
    <button {...rest} className={['chip', active ? 'active' : ''].filter(Boolean).join(' ')}>
      {children}
    </button>
  );
}
