import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'on-dark' | 'neon' | 'outline-dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

const sizeClass: Record<ButtonSize, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return ['btn', `btn-${variant}`, sizeClass[size], className].filter(Boolean).join(' ');
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & { href?: undefined };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

/** Pill-shaped call-to-action button. Wraps the real `.btn` / `.btn-*` classes from globals.css. */
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', children, ...rest } = props;
  const cls = classes(variant, size);

  if ('href' in rest && rest.href !== undefined) {
    const anchorRest = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a {...anchorRest} className={cls}>
        {children}
      </a>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...buttonRest} className={cls}>
      {children}
    </button>
  );
}
