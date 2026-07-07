import * as React from 'react';

/**
 * Badge — from padelmgt-design-system@1.0.0.
 */
export interface BadgeProps {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary" | "neon" | "outline";
  children: React.ReactNode;
  className?: string;
}

export declare const Badge: React.ComponentType<BadgeProps>;
