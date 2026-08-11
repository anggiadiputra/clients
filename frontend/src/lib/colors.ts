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

export const primaryText: Record<string, string> = {
  black: 'text-black',
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  purple: 'text-purple-600',
  red: 'text-red-600',
  orange: 'text-orange-600',
};

export const primaryRing: Record<string, string> = {
  black: 'focus:ring-black',
  blue: 'focus:ring-blue-600',
  emerald: 'focus:ring-emerald-600',
  purple: 'focus:ring-purple-600',
  red: 'focus:ring-red-600',
  orange: 'focus:ring-orange-600',
};

export const primaryBorder: Record<string, string> = {
  black: 'border-black',
  blue: 'border-blue-600',
  emerald: 'border-emerald-600',
  purple: 'border-purple-600',
  red: 'border-red-600',
  orange: 'border-orange-600',
};

export const primaryLightBg: Record<string, string> = {
  black: 'bg-gray-100',
  blue: 'bg-blue-50',
  emerald: 'bg-emerald-50',
  purple: 'bg-purple-50',
  red: 'bg-red-50',
  orange: 'bg-orange-50',
};

export const primaryBadge: Record<string, string> = {
  black: 'bg-black text-white',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
};

export function getPrimaryClasses(color: string) {
  const c = color || 'black';
  return {
    bg: primaryBg[c] || 'bg-black',
    hover: primaryHover[c] || 'hover:bg-gray-800',
    text: primaryText[c] || 'text-black',
    ring: primaryRing[c] || 'focus:ring-black',
    border: primaryBorder[c] || 'border-black',
    lightBg: primaryLightBg[c] || 'bg-gray-100',
    badge: primaryBadge[c] || 'bg-black text-white',
    button: `${primaryBg[c] || 'bg-black'} text-white ${primaryHover[c] || 'hover:bg-gray-800'} transition-colors`,
  };
}
