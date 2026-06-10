'use client';

import { useEffect } from 'react';
import { initPlanLimits, initVerifiedPlan } from '@/lib/plan-config';

/** Fetches server-verified plan + SA-configured limits once per session. */
export default function PlanBootstrap() {
  useEffect(() => {
    void initVerifiedPlan();
    void initPlanLimits();
  }, []);
  return null;
}
