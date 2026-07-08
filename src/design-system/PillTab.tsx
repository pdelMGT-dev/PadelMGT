import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type PillTabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  active?: boolean;
  children: ReactNode;
};

/** Tab-style pill button, used for section/view switches. Wraps the real `.pill-tab` class from globals.css. */
export function PillTab({ active, children, ...rest }: PillTabProps) {
  return (
    <button {...rest} className={['pill-tab', active ? 'active' : ''].filter(Boolean).join(' ')}>
      {children}
    </button>
  );
}
