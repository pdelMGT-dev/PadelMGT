import * as React from 'react';

/**
 * Chip — from padelmgt-design-system@1.0.0.
 */
export interface ChipProps {
  id?: string;
  style?: CSSProperties;
  children: React.ReactNode;
  active?: boolean;
}

export declare const Chip: React.ComponentType<ChipProps>;
