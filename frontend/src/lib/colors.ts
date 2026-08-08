// Map primary color name → Tailwind classes
export const primaryBg: Record<string, string> = {
  black: 'bg-black',
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-600',
  purple: 'bg-purple-600',
  red: 'bg-red-600',
  orange: 'bg-orange-600',
};

export const primaryHover: Record<string, string> = {
  black: 'hover:bg-gray-800',
  blue: 'hover:bg-blue-700',
  emerald: 'hover:bg-emerald-700',
  purple: 'hover:bg-purple-700',
  red: 'hover:bg-red-700',
  orange: 'hover:bg-orange-700',
};

export const primaryRing: Record<string, string> = {
  black: 'focus:ring-black',
  blue: 'focus:ring-blue-600',
  emerald: 'focus:ring-emerald-600',
  purple: 'focus:ring-purple-600',
  red: 'focus:ring-red-600',
  orange: 'focus:ring-orange-600',
};

export function getPrimaryClasses(color: string) {
  const c = color || 'black';
  return {
    bg: primaryBg[c] || 'bg-black',
    hover: primaryHover[c] || 'hover:bg-gray-800',
    ring: primaryRing[c] || 'focus:ring-black',
    button: `${primaryBg[c] || 'bg-black'} text-white ${primaryHover[c] || 'hover:bg-gray-800'}`,
  };
}
