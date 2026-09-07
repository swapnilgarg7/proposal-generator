import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Matches the helper in sorvex-landing/lib/utils.ts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
