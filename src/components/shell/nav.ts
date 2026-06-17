/** Serializable nav config passed from server layouts into client shells. */
export type NavItem = {
  title: string;
  href: string;
  /** Lucide icon name resolved client-side. */
  icon: string;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};
