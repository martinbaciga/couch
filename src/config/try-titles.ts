import type { Kind } from "@/lib/availability/types";

export type TryTitle = {
  kind: Kind;
  id: number;
  label: string;
};

/**
 * The two suggestions on the first-visit landing and in the search modal
 * before anything has been viewed. Labels are the first-visit frames.
 * The owner can replace this list.
 */
export const tryTitles: TryTitle[] = [
  { kind: "movie", id: 550, label: "Fight Club" },
  { kind: "movie", id: 603, label: "The Matrix" },
];
