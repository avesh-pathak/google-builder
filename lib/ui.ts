/**
 * Shared class recipes — one place to keep the shape/colour system consistent
 * across every component (pill buttons, 16px cards, warm borders).
 */

export const card = "rounded-2xl border border-cream-300 bg-white shadow-soft";

export const cardInteractive =
  "rounded-2xl border border-cream-300 bg-white shadow-soft transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-caramel-300 hover:shadow-lifted";

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-caramel-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-caramel-700 active:bg-caramel-700 disabled:cursor-not-allowed disabled:bg-cream-300 disabled:text-espresso-400";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-cream-300 bg-white px-4 py-2.5 text-sm font-semibold text-espresso-700 transition-colors duration-200 hover:border-caramel-300 hover:bg-caramel-50 hover:text-caramel-700 active:bg-caramel-100 disabled:cursor-not-allowed disabled:text-espresso-300";

export const buttonGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-espresso-600 transition-colors duration-200 hover:bg-cream-200 hover:text-espresso-800";

export const buttonDark =
  "inline-flex items-center justify-center gap-2 rounded-full bg-espresso-800 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors duration-200 hover:bg-espresso-900";

export const field =
  "w-full rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-2.5 text-sm text-espresso-800 placeholder:text-espresso-400 focus:border-caramel-400 focus:bg-white focus:outline-none";

export const label = "block text-sm font-medium text-espresso-700";

export const chipBase =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-200";

export const chipOn =
  "border-caramel-300 bg-caramel-50 text-caramel-700";
export const chipOff =
  "border-cream-300 bg-white text-espresso-500 hover:border-caramel-200 hover:text-espresso-700";
