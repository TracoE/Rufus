import React from 'react';

interface LogoRufusProps {
  height?: number;
  className?: string;
}

export const LogoRufus: React.FC<LogoRufusProps> = ({ height = 40, className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 380 160"
      height={height}
      className={className}
      role="img"
      aria-label="RUFUS"
    >
      <text
        x="30"
        y="105"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="90"
        fill="#FFFFFF"
      >
        Rufus
      </text>
      <g transform="translate(295, 20)">
        <circle cx="25" cy="25" r="22" fill="none" stroke="#007BFF" strokeWidth="4" />
        <text
          x="25"
          y="36"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fontSize="38"
          fill="#007BFF"
          textAnchor="middle"
        >
          -e
        </text>
      </g>
    </svg>
  );
};