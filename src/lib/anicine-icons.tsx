"use client";

/**
 * Centralized lucide-react icon registry for CornCine.
 *
 * Sister of src/lib/anicine-icons.tsx. CornCine adds a couple of adult-specific
 * entries (Lock, Flame, Diamond) and reuses the rest of the AniCine set so the
 * two sites stay visually consistent.
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Camera,
  CircleHelp,
  Compass,
  Diamond,
  Download,
  Film,
  Flame,
  Headphones,
  Image as ImageIcon,
  Link2,
  Lock,
  Magnet,
  MessagesSquare,
  Music,
  PlayCircle,
  Rocket,
  Sparkles,
  Swords,
  Trophy,
  Twitter,
  Video,
  Wand2,
  Zap,
  PlaySquare,
  Globe,
  ShieldAlert,
} from "lucide-react";

export const ICON_REGISTRY = {
  Film,
  Swords,
  BookOpen,
  Zap,
  Rocket,
  Sparkles,
  Trophy,
  Wand2,
  Compass,
  Magnet,
  PlayCircle,
  PlaySquare,
  Music,
  Twitter,
  MessagesSquare,
  Video,
  Download,
  Headphones,
  Link2,
  CircleHelp,
  Camera,
  Diamond,
  Flame,
  Lock,
  Image: ImageIcon,
  Globe,
  ShieldAlert,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_REGISTRY;

export function IconByName({
  name,
  className,
  fallback,
}: {
  name?: string;
  className?: string;
  fallback?: LucideIcon;
}) {
  if (!name) {
    const F = fallback ?? Sparkles;
    return <F className={className} aria-hidden="true" />;
  }
  const normalized = (name in ICON_REGISTRY
    ? name
    : name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())) as IconName;
  const Comp = ICON_REGISTRY[normalized] ?? fallback ?? Sparkles;
  return <Comp className={className} aria-hidden="true" />;
}
