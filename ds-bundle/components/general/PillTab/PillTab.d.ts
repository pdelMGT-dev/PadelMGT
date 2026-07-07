import * as React from 'react';

/**
 * PillTab — from padelmgt-design-system@1.0.0.
 */
export interface PillTabProps {
  id?: string;
  style?: CSSProperties;
  children: React.ReactNode;
  active?: boolean;
}

export declare const PillTab: React.ComponentType<PillTabProps>;
