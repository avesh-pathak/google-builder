import { Compass, NotebookText, ScanSearch, Users, type LucideIcon } from "lucide-react";

export type TabId = "discover" | "menu" | "memory" | "friends";

export interface TabDefinition {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const TABS: TabDefinition[] = [
  { id: "discover", label: "Discover", shortLabel: "Discover", icon: Compass },
  { id: "menu", label: "Explore Menu", shortLabel: "Menu", icon: ScanSearch },
  { id: "memory", label: "My Memory", shortLabel: "Memory", icon: NotebookText },
  { id: "friends", label: "Friends", shortLabel: "Friends", icon: Users },
];
