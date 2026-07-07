import * as React from 'react';

/**
 * EventPill — from padelmgt-design-system@1.0.0.
 */
export interface EventPillProps {
  kind?: "tournament" | "league" | "quick";
  children: React.ReactNode;
}

export declare const EventPill: React.ComponentType<EventPillProps>;
