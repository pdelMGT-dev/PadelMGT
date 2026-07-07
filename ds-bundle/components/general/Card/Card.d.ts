import * as React from 'react';

/**
 * Card — from padelmgt-design-system@1.0.0.
 */
export interface CardProps {
  id?: string;
  children: React.ReactNode;
  /** 'solid' matches bordered containers (tables, list wrappers). 'dashed' matches empty-state placeholders. */
  variant?: "solid" | "dashed";
  padding?: string | number;
  style?: CSSProperties;
}

export declare const Card: React.ComponentType<CardProps>;
