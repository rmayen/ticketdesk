/** node:sqlite returns loosely typed rows; these helpers centralize the cast so the repo stays readable. */
export const rows = <T>(v: unknown): T[] => v as T[];
export const row = <T>(v: unknown): T | undefined => v as T | undefined;
