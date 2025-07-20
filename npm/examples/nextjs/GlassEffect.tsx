'use client'; // For Next.js 13+ App Router

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with WebGL
const PhysicsGlassLoader = dynamic(
  () => import('./PhysicsGlassClient'),
  { 
    ssr: false,
    loading: () => <div className="loading">Loading glass effects...</div>
  }
);

interface GlassEffectProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassEffect: React.FC<GlassEffectProps> = ({
  width = 800,
  height = 600,
  className,
  style
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div 
        className={className}
        style={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          ...style 
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <PhysicsGlassLoader 
      width={width}
      height={height}
      className={className}
      style={style}
    />
  );
};

export default GlassEffect; 