// app/components/ui/ZeroKeyLogo.tsx
'use client';

import React from 'react';

interface ZeroKeyLogoProps {
    className?: string;
    size?: number;
    style?: React.CSSProperties;
}

export function ZeroKeyLogo({ className = "w-6 h-6", size, style }: ZeroKeyLogoProps) {
    const finalStyle = { ...style, ...(size ? { width: size, height: size } : {}) };

    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={finalStyle}
        >
            <defs>
                <mask id="keyMask">
                    {/* Everything white is visible */}
                    <rect x="0" y="0" width="24" height="24" fill="white" />
                    
                    {/* The Zero Slash */}
                    <line x1="20" y1="2" x2="4" y2="22" stroke="black" strokeWidth="1.5" strokeLinecap="round" />

                    {/* The key silhouette cutout (black means transparent) */}
                    {/* Key Head (hole) */}
                    <circle cx="12" cy="8.5" r="2.5" fill="black" />
                    {/* Key Shaft */}
                    <rect x="11" y="8.5" width="2" height="9.5" fill="black" />
                    {/* Key Teeth */}
                    <rect x="13" y="13" width="3" height="2" fill="black" />
                    <rect x="13" y="16" width="3" height="2" fill="black" />
                </mask>
            </defs>

            {/* A sharp technical digital zero block */}
            <rect 
                x="3" 
                y="2" 
                width="18" 
                height="20" 
                rx="4" 
                fill="currentColor" 
                mask="url(#keyMask)" 
            />
        </svg>
    );
}
