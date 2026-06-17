"use client";

import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  Layers,
  LayoutDashboard,
  Megaphone,
  QrCode,
  School,
  ScrollText,
  Search,
  Settings,
  TrendingUp,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "bar-chart": BarChart3,
  "book-open": BookOpen,
  building: Building2,
  calendar: CalendarDays,
  "calendar-range": CalendarRange,
  "clipboard-check": ClipboardCheck,
  "clipboard-list": ClipboardList,
  "file-text": FileText,
  "graduation-cap": GraduationCap,
  home: Home,
  layers: Layers,
  dashboard: LayoutDashboard,
  megaphone: Megaphone,
  "qr-code": QrCode,
  school: School,
  scroll: ScrollText,
  search: Search,
  settings: Settings,
  "trending-up": TrendingUp,
  user: User,
  "user-cog": UserCog,
  users: Users,
};

export function NavIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}
