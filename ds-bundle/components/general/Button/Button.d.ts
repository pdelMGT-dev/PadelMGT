import * as React from 'react';

/**
 * Button — from padelmgt-design-system@1.0.0.
 * @replaces button
 */
export interface ButtonProps {
  variant?: "primary" | "neon" | "secondary" | "on-dark" | "outline-dark";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
  href?: string;
}

export declare const Button: React.ComponentType<ButtonProps>;
