import { useStore } from '../store/useStoreImpl';

export const useThemeStyles = () => {
  const { theme } = useStore();
  const isLight = theme === 'light';
  const isBlue = theme === 'blue';
  const isGold = theme === 'gold';
  const isDark = theme === 'dark';

  const getBackgroundClass = () => {
    switch (theme) {
      case 'blue':
        return "bg-[#080B14] text-[#F8FAFC]"; // Deep ocean Web3 vibe
      case 'light':
        return "bg-[#F2F2F7] text-[#000000]"; // Clean iOS-like light mode
      case 'gold':
        return "bg-[#121212] text-[#FAFAFA]"; // Charcoal black luxury
      case 'dark':
      default:
        return "bg-[#0F0F13] text-white"; // Telegram-native deep dark
    }
  };

  const getCardClass = () => {
    if (isLight) return "bg-[#FFFFFF] border border-black/5 shadow-sm rounded-2xl";
    if (isBlue) return "bg-[#101828]/80 border border-blue-500/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(30,58,138,0.15)] rounded-2xl";
    if (isGold) return "bg-[#1E1E1E]/90 border border-[#D4AF37]/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(212,175,55,0.1)] rounded-2xl";
    return "bg-[#1C1C22]/80 border border-white/5 backdrop-blur-xl shadow-xl rounded-2xl";
  };

  const getPanelClass = () => {
    if (isLight) return "bg-[#FFFFFF] border border-black/5 shadow-sm rounded-3xl";
    if (isBlue) return "bg-[#101828]/90 border border-blue-500/20 backdrop-blur-xl shadow-2xl rounded-3xl";
    if (isGold) return "bg-[#1E1E1E]/95 border border-[#D4AF37]/30 backdrop-blur-xl shadow-2xl rounded-3xl";
    return "bg-[#1C1C22]/90 border border-white/5 backdrop-blur-xl shadow-2xl rounded-3xl";
  };

  const getHeaderClass = () => {
    if (isLight) return "bg-[#F2F2F7]/90 border-b border-black/5 backdrop-blur-xl";
    if (isBlue) return "bg-[#080B14]/90 border-b border-blue-500/20 backdrop-blur-xl";
    if (isGold) return "bg-[#121212]/90 border-b border-[#D4AF37]/20 backdrop-blur-xl";
    return "bg-[#0F0F13]/90 border-b border-white/5 backdrop-blur-xl";
  };

  const getTextClass = (type: 'primary' | 'secondary' | 'accent' = 'primary') => {
    if (type === 'primary') {
      if (isLight) return "text-[#000000]";
      if (isBlue) return "text-[#F8FAFC]";
      if (isGold) return "text-[#FAFAFA]";
      return "text-[#FFFFFF]";
    }
    if (type === 'secondary') {
      if (isLight) return "text-[#636366]";
      if (isBlue) return "text-[#CBD5E1]";
      if (isGold) return "text-[#D4D4D8]";
      return "text-[#D1D5DB]";
    }
    if (type === 'accent') {
      if (isLight) return "text-[#007AFF]";
      if (isBlue) return "text-[#38BDF8]";
      if (isGold) return "text-[#D4AF37]";
      return "text-[#3390EC]"; // Telegram Blue
    }
    return "";
  };

  const getButtonClass = (variant: 'primary' | 'secondary' = 'primary') => {
    if (variant === 'primary') {
      if (isLight) return "bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/30 hover:bg-[#0056b3] transition-all";
      if (isBlue) return "bg-[#2563EB] text-white shadow-lg shadow-blue-500/40 hover:bg-blue-500 transition-all";
      if (isGold) return "bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black font-bold shadow-lg shadow-[#D4AF37]/30 hover:opacity-90 transition-all";
      return "bg-[#3390EC] text-white shadow-lg shadow-[#3390EC]/30 hover:bg-[#2AABEE] transition-all";
    }
    // Secondary
    if (isLight) return "bg-[#E5E5EA] text-[#1C1C1E] hover:bg-[#D1D1D6] transition-all";
    if (isBlue) return "bg-[#1E293B] text-[#94A3B8] hover:bg-[#334155] transition-all";
    if (isGold) return "bg-[#262626] text-[#D4AF37] hover:bg-[#333333] transition-all";
    return "bg-[#2C2C2E] text-[#FFFFFF] hover:bg-[#3A3A3C] transition-all";
  };

  const getNavClass = () => {
    if (isLight) return "bg-[#F2F2F7]/95 border-t border-black/5 backdrop-blur-xl";
    if (isBlue) return "bg-[#080B14]/95 border-t border-blue-500/20 backdrop-blur-xl";
    if (isGold) return "bg-[#121212]/95 border-t border-[#D4AF37]/20 backdrop-blur-xl";
    return "bg-[#0F0F13]/95 border-t border-white/5 backdrop-blur-xl";
  };

  const getNavItemClass = (isActive: boolean) => {
    if (isActive) {
      if (isLight) return "text-[#007AFF] font-semibold";
      if (isBlue) return "text-[#38BDF8] font-semibold drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]";
      if (isGold) return "text-[#D4AF37] font-semibold drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]";
      return "text-[#3390EC] font-semibold drop-shadow-[0_0_8px_rgba(51,144,236,0.4)]";
    }
    // Inactive
    if (isLight) return "text-[#636366] hover:text-[#007AFF]";
    if (isBlue) return "text-[#CBD5E1] hover:text-[#38BDF8]";
    if (isGold) return "text-[#D4D4D8] hover:text-[#D4AF37]";
    return "text-[#D1D5DB] hover:text-[#3390EC]";
  };

  return {
    theme,
    isLight,
    isBlue,
    isGold,
    isDark,
    bgClass: getBackgroundClass(),
    cardClass: getCardClass(),
    panelClass: getPanelClass(),
    headerClass: getHeaderClass(),
    navClass: getNavClass(),
    getNavItemClass,
    textPrimary: getTextClass('primary'),
    textSecondary: getTextClass('secondary'),
    textAccent: getTextClass('accent'),
    btnPrimary: getButtonClass('primary'),
    btnSecondary: getButtonClass('secondary'),
  };
};
