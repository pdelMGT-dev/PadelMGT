import * as React from 'react';

/**
 * SectionHeader — from padelmgt-design-system@1.0.0.
 */
export interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export declare const SectionHeader: React.ComponentType<SectionHeaderProps>;
