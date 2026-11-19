import type { Kind } from "@/lib/availability/types";

export type TryTitle = {
  kind: Kind;
  id: number;
  label: string;
};

/**
 * The two suggestions in the search modal before anything has been viewed.
 * Labels and ids are the titles drawn in the Figma start frame. The owner
 * can replace them; the landing page reads this same list.
 */
export const tryTitles: TryTitle[] = [
  { kind: "movie", id: 550, label: "Fight Club" },
  { kind: "movie", id: 13, label: "Forrest Gump" },
];
