import * as React from 'react';

/**
 * EmptyState — from padelmgt-design-system@1.0.0.
 */
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export declare const EmptyState: React.ComponentType<EmptyStateProps>;
