"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlanLimits, getTrialDaysLeft } from "@/lib/plans";

interface OrgData {
  orgId: string | null;
  orgName: string | null;
  orgPlan: string | null;
  orgStatus: string | null;
  role: string | null;
  userId: string | null;
  userName: string | null;
  maxProperties: number;
  maxMembers: number;
  trialDaysLeft: number;
  loading: boolean;
}

export function useOrg(): OrgData {
  const [data, setData] = useState<OrgData>({
    orgId: null,
    orgName: null,
    orgPlan: null,
    orgStatus: null,
    role: null,
    userId: null,
    userName: null,
    maxProperties: 1,
    maxMembers: 1,
    trialDaysLeft: 0,
    loading: true,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      const { data: memberships } = await supabase
        .from("memberships")
        .select("org_id, role, organizations(name, plan, status, trial_ends_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const membership = memberships?.[0];

      if (membership) {
        const org = membership.organizations as unknown as Record<string, string> | null;
        const plan = org?.plan ?? "FREE";
        const limits = getPlanLimits(plan);
        setData({
          orgId: membership.org_id,
          orgName: org?.name ?? null,
          orgPlan: plan,
          orgStatus: org?.status ?? null,
          role: membership.role,
          userId: user.id,
          userName: user.user_metadata?.first_name ?? null,
          maxProperties: limits.maxProperties,
          maxMembers: limits.maxMembers,
          trialDaysLeft: getTrialDaysLeft(org?.trial_ends_at ?? null),
          loading: false,
        });
      } else {
        setData((prev) => ({ ...prev, userId: user.id, loading: false }));
      }
    }
    load();
  }, []);

  return data;
}
