import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const EV_THEME = {
  colors: {
    navyDark: '#0B132B',
    navyCard: '#1C2541',
    navyBorder: '#3A506B',
    electricBlue: '#00B4D8',
    electricBlueDark: '#0077B6',
    emerald: '#10B981',
    emeraldDark: '#059669',
    amber: '#F59E0B',
    rose: '#EF4444',
  },
} as const;
