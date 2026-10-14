"use client";

import type { ComponentProps } from "react";
import {
  Activity,
  Building2,
  TrendingDown,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const icons = {
  activity: Activity,
  building: Building2,
  "trending-down": TrendingDown,
  users: Users,
  wallet: Wallet,
} satisfies Record<string, LucideIcon>;

type AppIconProps = ComponentProps<"svg"> & {
  name: keyof typeof icons;
};

export function AppIcon({ name, ...props }: AppIconProps) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" {...props} />;
}