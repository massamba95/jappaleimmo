"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlanLimits, getTrialDaysLeft } from "@/lib/plans";

interface OrgData {
  orgId: string | null;
  orgName: string | null;
  orgSlug: string | null;
  orgPlan: string | null;
  orgStatus: string | null;
  orgOwnerId: string | null;
  role: string | null;
  membershipStatus: string | null;
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
    orgSlug: null,
    orgPlan: null,
    orgStatus: null,
    orgOwnerId: null,
    role: null,
    membershipStatus: null,
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

      // D'abord chercher un membership ACTIVE
      const { data: memberships } = await supabase
        .from("memberships")
        .select("org_id, role, status, organizations(name, slug, plan, status, trial_ends_at, owner_id)")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1);

      let membership = memberships?.[0];

      // Si pas de membership ACTIVE, chercher PENDING
      if (!membership) {
        const { data: pendingMemberships } = await supabase
          .from("memberships")
          .select("org_id, role, status, organizations(name, slug, plan, status, trial_ends_at, owner_id)")
          .eq("user_id", user.id)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false })
          .limit(1);

        membership = pendingMemberships?.[0];
      }

      if (membership) {
        const org = membership.organizations as unknown as Record<string, string> | null;
        const plan = org?.plan ?? "FREE";
        const limits = getPlanLimits(plan);
        setData({
          orgId: membership.org_id,
          orgName: org?.name ?? null,
          orgSlug: org?.slug ?? null,
          orgPlan: plan,
          orgStatus: org?.status ?? null,
          orgOwnerId: org?.owner_id ?? null,
          role: membership.role,
          membershipStatus: membership.status,
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
