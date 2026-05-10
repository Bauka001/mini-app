import { SVGProps } from 'react';

type CaseIconProps = SVGProps<SVGSVGElement> & { caseId: string };

export const CaseIcon = ({ caseId, ...props }: CaseIconProps) => {
  if (caseId === 'legendary_case') {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M15 40V80C15 85.5228 19.4772 90 25 90H75C80.5228 90 85 85.5228 85 80V40" fill="url(#paint0_linear)" />
        <path d="M85 40C85 28.9543 76.0457 20 65 20H35C23.9543 20 15 28.9543 15 40H85Z" fill="url(#paint1_linear)" />
        <path d="M25 40H75V45H25V40Z" fill="#FDE047" />
        <rect x="40" y="35" width="20" height="20" rx="4" fill="#EAB308" />
        <circle cx="50" cy="45" r="4" fill="#451A03" />
        <path d="M50 45V51" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />
        <path d="M25 20H75M15 60H85M25 90H75" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
        <defs>
          <linearGradient id="paint0_linear" x1="50" y1="40" x2="50" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B45309" />
            <stop offset="1" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="paint1_linear" x1="50" y1="20" x2="50" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D97706" />
            <stop offset="1" stopColor="#92400E" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (caseId === 'rare_case') {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M15 40V80C15 85.5228 19.4772 90 25 90H75C80.5228 90 85 85.5228 85 80V40" fill="url(#paint2_linear)" />
        <path d="M85 40C85 28.9543 76.0457 20 65 20H35C23.9543 20 15 28.9543 15 40H85Z" fill="url(#paint3_linear)" />
        <path d="M25 40H75V45H25V40Z" fill="#C4B5FD" />
        <rect x="40" y="35" width="20" height="20" rx="4" fill="#8B5CF6" />
        <circle cx="50" cy="45" r="4" fill="#2E1065" />
        <path d="M50 45V51" stroke="#2E1065" strokeWidth="2" strokeLinecap="round" />
        <path d="M25 20H75M15 60H85M25 90H75" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round" />
        <defs>
          <linearGradient id="paint2_linear" x1="50" y1="40" x2="50" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6D28D9" />
            <stop offset="1" stopColor="#4C1D95" />
          </linearGradient>
          <linearGradient id="paint3_linear" x1="50" y1="20" x2="50" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7C3AED" />
            <stop offset="1" stopColor="#5B21B6" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // basic_case
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M15 40V80C15 85.5228 19.4772 90 25 90H75C80.5228 90 85 85.5228 85 80V40" fill="url(#paint4_linear)" />
      <path d="M85 40C85 28.9543 76.0457 20 65 20H35C23.9543 20 15 28.9543 15 40H85Z" fill="url(#paint5_linear)" />
      <path d="M25 40H75V45H25V40Z" fill="#67E8F9" />
      <rect x="40" y="35" width="20" height="20" rx="4" fill="#06B6D4" />
      <circle cx="50" cy="45" r="4" fill="#083344" />
      <path d="M50 45V51" stroke="#083344" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 20H75M15 60H85M25 90H75" stroke="#22D3EE" strokeWidth="4" strokeLinecap="round" />
      <defs>
        <linearGradient id="paint4_linear" x1="50" y1="40" x2="50" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0891B2" />
          <stop offset="1" stopColor="#164E63" />
        </linearGradient>
        <linearGradient id="paint5_linear" x1="50" y1="20" x2="50" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#0C4A6E" />
        </linearGradient>
      </defs>
    </svg>
  );
};
