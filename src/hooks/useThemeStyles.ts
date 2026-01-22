import { useStore } from '../store/useStore';
import { clsx } from 'clsx';

export const useThemeStyles = () => {
  const { theme } = useStore();
  const isLight = theme === 'light';
  const isBlue = theme === 'blue';
  const isGold = theme === 'gold';
  const isDark = theme === 'dark';

  const getBackgroundClass = () => {
    switch (theme) {
      case 'blue':
        return "bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white";
      case 'light':
        return "bg-gradient-to-br from-green-100 via-white to-green-50 text-gray-900";
      case 'gold':
        return "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-400/40 via-gray-900 to-black text-white";
      case 'dark':
      default:
        return "bg-black text-white";
    }
  };

  const getCardClass = () => {
    if (isLight) return "bg-white border-green-100 shadow-sm";
    if (isBlue) return "bg-blue-900/20 border-blue-400/30";
    if (isGold) return "bg-amber-900/20 border-amber-500/20";
    return "bg-white/10 border-white/10";
  };

  const getHeaderClass = () => {
    if (isLight) return "bg-white/80 border-green-200";
    if (isBlue) return "bg-blue-900/40 border-blue-400/30";
    if (isGold) return "bg-amber-900/10 border-amber-500/20";
    return "bg-white/5 border-white/10";
  };

  const getTextClass = (type: 'primary' | 'secondary' | 'accent' = 'primary') => {
    if (type === 'primary') {
      return isLight ? "text-gray-900" : "text-white";
    }
    if (type === 'secondary') {
      return isLight ? "text-gray-500" : "text-gray-400";
    }
    if (type === 'accent') {
      if (isLight) return "text-green-600";
      if (isBlue) return "text-blue-400";
      if (isGold) return "text-yellow-500";
      return "text-primary";
    }
    return "";
  };

  const getButtonClass = (variant: 'primary' | 'secondary' = 'primary') => {
    if (variant === 'primary') {
      if (isLight) return "bg-green-500 text-white shadow-lg shadow-green-500/30 hover:bg-green-600";
      if (isBlue) return "bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600";
      if (isGold) return "bg-yellow-600 text-white shadow-lg shadow-yellow-500/30 hover:bg-yellow-700";
      return "bg-primary text-black shadow-lg shadow-primary/20 hover:bg-primary/90";
    }
    // Secondary
    if (isLight) return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    if (isBlue) return "bg-blue-900/20 text-blue-200 hover:bg-blue-900/30";
    if (isGold) return "bg-yellow-900/20 text-yellow-500 hover:bg-yellow-900/30";
    return "bg-white/10 text-white hover:bg-white/20";
  };

  return {
    theme,
    isLight,
    isBlue,
    isGold,
    isDark,
    bgClass: getBackgroundClass(),
    cardClass: getCardClass(),
    headerClass: getHeaderClass(),
    textPrimary: getTextClass('primary'),
    textSecondary: getTextClass('secondary'),
    textAccent: getTextClass('accent'),
    btnPrimary: getButtonClass('primary'),
    btnSecondary: getButtonClass('secondary'),
  };
};
