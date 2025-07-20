import React, { useRef, useEffect, useState } from 'react';

// This will be imported dynamically to avoid SSR issues
let PhysicsGlass: any = null;
let GLASS_MATERIALS: any = null;

interface PhysicsGlassClientProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const PhysicsGlassClient: React.FC<PhysicsGlassClientProps> = ({
  width = 800,
  height = 600,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glassRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic import of the physics glass library
  useEffect(() => {
    const loadPhysicsGlass = async () => {
      try {
        const module = await import('physics-glass-effects');
        PhysicsGlass = module.PhysicsGlass;
        GLASS_MATERIALS = module.GLASS_MATERIALS;
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load physics glass effects library');
        setIsLoading(false);
      }
    };

    loadPhysicsGlass();
  }, []);

  // Initialize glass effect once library is loaded
  useEffect(() => {
    if (!canvasRef.current || !PhysicsGlass || isLoading) return;

    const config = {
      shape: 'sphere',
      backgroundPattern: 'stripes',
      mouse: {
        enabled: true,
        followCursor: true
      },
      animation: {
        enabled: true,
        speed: 1.0,
        surfaceRipples: true
      },
      onReady: () => {
        setIsReady(true);
        setError(null);
      },
      onError: (err: Error) => {
        setError(err.message);
        setIsReady(false);
      }
    };

    try {
      glassRef.current = new PhysicsGlass(canvasRef.current, config);
    } catch (err) {
      setError((err as Error).message);
    }

    // Cleanup on unmount
    return () => {
      if (glassRef.current) {
        glassRef.current.destroy();
        glassRef.current = null;
      }
    };
  }, [isLoading]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (glassRef.current) {
        glassRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div 
        className={className}
        style={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '8px',
          ...style 
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div>Loading WebGL Physics Engine...</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Initializing glass effects
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          maxWidth: width,
          maxHeight: height
        }}
      />
      {error && (
        <div style={{ 
          color: 'red', 
          padding: '10px',
          background: '#ffebee',
          border: '1px solid #e57373',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          Error: {error}
        </div>
      )}
      {!isReady && !error && !isLoading && (
        <div style={{ 
          padding: '10px',
          background: '#e3f2fd',
          border: '1px solid #90caf9',
          borderRadius: '4px',
          marginTop: '10px'
        }}>
          Initializing glass physics...
        </div>
      )}
    </div>
  );
};

export default PhysicsGlassClient; 