import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const dimensions = {
    sm: { text: 'text-lg sm:text-xl' },
    md: { text: 'text-2xl sm:text-3xl md:text-4xl' },
    lg: { text: 'text-4xl sm:text-5xl md:text-6xl' },
    xl: { text: 'text-6xl sm:text-7xl md:text-8xl' },
  };

  const current = dimensions[size];

  return (
    <div className={`flex items-center select-none leading-none ${className}`}>
      {showText && (
        <span className="font-outfit font-black select-none tracking-normal">
          <span 
            className={`${current.text} text-white uppercase`}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            SUPER
          </span>
          <span 
            className={`${current.text} uppercase glow-text-yellow`}
            style={{ 
              fontFamily: "'Outfit', sans-serif",
              color: '#FACC15',
              textShadow: '0 0 12px rgba(250, 204, 21, 0.45)'
            }}
          >
            TOUR
          </span>
          <span 
            className={`${current.text} text-white uppercase`}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            CHANNEL
          </span>
        </span>
      )}
    </div>
  );
};
