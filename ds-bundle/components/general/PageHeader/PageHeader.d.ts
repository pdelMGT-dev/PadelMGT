import * as React from 'react';

/**
 * PageHeader — from padelmgt-design-system@1.0.0.
 */
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export declare const PageHeader: React.ComponentType<PageHeaderProps>;
