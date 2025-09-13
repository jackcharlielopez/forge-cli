import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A utility function that merges Tailwind CSS classes and handles class variance conflicts
 * @param inputs - Class names or class variance authority conditions
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
