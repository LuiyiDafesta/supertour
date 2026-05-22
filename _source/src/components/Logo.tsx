import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const dimensions = {
    sm: { emblem: 'h-8 w-8', text: 'text-xs sm:text-sm', spacing: 'gap-2' },
    md: { emblem: 'h-10 w-10', text: 'text-sm sm:text-base md:text-lg', spacing: 'gap-3' },
    lg: { emblem: 'h-16 w-16', text: 'text-xl sm:text-2xl md:text-3xl', spacing: 'gap-4' },
    xl: { emblem: 'h-24 w-24', text: 'text-3xl sm:text-4xl md:text-5xl', spacing: 'gap-6' },
  };

  const current = dimensions[size];

  return (
    <div className={`flex items-center select-none ${current.spacing} ${className}`}>
      {/* Premium Shield Emblem (Double yellow border, black fill, ST central) */}
      <div className={`relative flex-shrink-0 ${current.emblem} transition-transform duration-300 hover:scale-105`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(250,204,21,0.35)]"
        >
          {/* Outer Rounded Crest Shield */}
          <path
            d="M15,8 L85,8 C85,8 88,48 82,73 C75,90 50,96 50,96 C50,96 25,90 18,73 C12,48 15,8 15,8 Z"
            fill="#000000"
            stroke="#FACC15"
            strokeWidth="5.5"
            strokeLinejoin="round"
          />
          {/* Inner Crest Border for Premium depth */}
          <path
            d="M21,14 L79,14 C79,14 81.5,46 76.5,67 C70.5,81.5 50,86.5 50,86.5 C50,86.5 29.5,81.5 23.5,67 C18.5,46 21,14 21,14 Z"
            fill="#000000"
            stroke="#FACC15"
            strokeWidth="1.8"
            strokeOpacity="0.85"
            strokeLinejoin="round"
          />
          {/* ST Typography in center */}
          <g transform="translate(0, 1)">
            {/* 'S' in White */}
            <text
              x="37"
              y="63"
              fontFamily="'Outfit', sans-serif"
              fontSize="45"
              fontWeight="950"
              fill="#FFFFFF"
              textAnchor="middle"
              className="tracking-tighter select-none font-black italic"
            >
              S
            </text>
            {/* 'T' in Yellow, slightly overlapping */}
            <text
              x="63"
              y="63"
              fontFamily="'Outfit', sans-serif"
              fontSize="45"
              fontWeight="950"
              fill="#FACC15"
              textAnchor="middle"
              className="tracking-tighter select-none font-black italic"
              style={{ filter: 'drop-shadow(0 0 5px rgba(250, 204, 21, 0.6))' }}
            >
              T
            </text>
          </g>
        </svg>
      </div>

      {/* Styled Brand Text: SUPER (white) TOUR (yellow) CHANNEL (white) in single line */}
      {showText && (
        <div className="flex items-center leading-none tracking-tight select-none flex-wrap">
          <span
            className={`${current.text} font-black text-white uppercase font-outfit`}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Super
          </span>
          <span
            className={`${current.text} font-black uppercase ml-1.5 font-outfit glow-text-yellow`}
            style={{
              fontFamily: "'Outfit', sans-serif",
              color: '#FACC15',
              textShadow: '0 0 10px rgba(250, 204, 21, 0.3)',
            }}
          >
            Tour
          </span>
          <span
            className={`${current.text} font-black text-white uppercase ml-1.5 font-outfit`}
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Channel
          </span>
        </div>
      )}
    </div>
  );
};

