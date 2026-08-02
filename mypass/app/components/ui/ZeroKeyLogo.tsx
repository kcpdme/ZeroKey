// app/components/ui/ZeroKeyLogo.tsx
'use client';

import React from 'react';

interface ZeroKeyLogoProps {
    className?: string;
    size?: number;
}

export function ZeroKeyLogo({ className = "w-6 h-6", size }: ZeroKeyLogoProps) {
    const style = size ? { width: size, height: size } : undefined;

    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={style}
        >
            <defs>
                <mask id="keyMask">
                    {/* Everything white is visible */}
                    <rect x="0" y="0" width="24" height="24" fill="white" />
                    
                    {/* The key silhouette cutout (black means transparent) */}
                    {/* Key Head (hole) */}
                    <circle cx="12" cy="7.5" r="2" fill="black" />
                    {/* Key Shaft */}
                    <rect x="11.25" y="7.5" width="1.5" height="9.5" fill="black" />
                    {/* Key Teeth */}
                    <rect x="12.75" y="12" width="2.25" height="1.5" fill="black" />
                    <rect x="12.75" y="15" width="2.25" height="1.5" fill="black" />
                </mask>
            </defs>

            {/* The bold digital zero with negative space key */}
            <rect 
                x="4" 
                y="2" 
                width="16" 
                height="20" 
                rx="8" 
                fill="currentColor" 
                mask="url(#keyMask)" 
            />
        </svg>
    );
}
