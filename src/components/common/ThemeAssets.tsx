import React from 'react';

export const C = {
  navy: '#16335A',
  nl: '#1F4478',
  green: '#3E9B52',
  gl: '#A8D8B0',
  blue: '#2563B8',
  sky: '#E8F1FB',
  teal: '#BCE0E6',
  gold: '#E8C77A',
  red: '#D9534F',
  text: '#1B2A41',
  mute: '#6B7C93',
  line: '#D5E2F2',
};

export const MASCOT_LOGO_SRC = '/mascot-512.png';

export const Mascot: React.FC<{ size?: number; className?: string }> = ({ size = 100, className = '' }) => (
  <img
    src={MASCOT_LOGO_SRC}
    alt="BoardBuddy Mascot"
    width={size}
    height={size}
    style={{ width: size, height: size }}
    className={`object-contain object-center select-none shrink-0 ${className}`}
  />
);

export const Badge: React.FC<{ size?: number; className?: string }> = ({ size = 46, className = '' }) => (
  <div 
    style={{ width: size, height: size }} 
    className={`rounded-full bg-white flex items-center justify-center shadow-md shadow-[#16335A]/15 shrink-0 overflow-hidden p-1 border border-[#D5E2F2]/60 ${className}`}
  >
    <Mascot size={Math.round(size * 0.84)} className="rounded-full" />
  </div>
);

export const Word: React.FC<{ size?: number; light?: boolean; className?: string }> = ({ 
  size = 40, 
  light = false,
  className = ''
}) => (
  <span 
    style={{ fontSize: size }} 
    className={`font-black tracking-tight select-none ${className}`}
  >
    <span style={{ color: light ? '#fff' : C.navy }}>Board</span>
    <span style={{ color: C.green }}>Buddy</span>
  </span>
);

export const BgWave: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 1000">
      <path d="M0 780 Q300 700 500 1000 L0 1000 Z" fill={C.teal} opacity="0.6" />
      <path d="M0 880 Q200 850 300 1000 L0 1000 Z" fill={C.navy} opacity="0.25" />
      <path d="M550 0 Q800 40 1000 130 L1000 0 Z" fill={C.teal} opacity="0.6" />
      <path d="M780 0 Q920 20 1000 70 L1000 0 Z" fill={C.navy} opacity="0.25" />
    </svg>
  </div>
);
