import React, { useRef, useEffect, useState } from 'react';
import { PhysicsGlass, PhysicsGlassConfig, GlassShape, BackgroundPattern } from 'physics-glass-effects';

interface GlassEffectProps {
  width?: number;
  height?: number;
  shape?: GlassShape;
  backgroundPattern?: BackgroundPattern;
  backgroundImage?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassEffectComponent: React.FC<GlassEffectProps> = ({
  width = 800,
  height = 600,
  shape = 'sphere',
  backgroundPattern = 'stripes',
  backgroundImage,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glassRef = useRef<PhysicsGlass | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const config: PhysicsGlassConfig = {
      shape,
      backgroundPattern,
      backgroundTexture: backgroundImage,
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
      onError: (err) => {
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
  }, []);

  // Update shape when prop changes
  useEffect(() => {
    if (glassRef.current && isReady) {
      glassRef.current.setShape(shape);
    }
  }, [shape, isReady]);

  // Update background pattern when prop changes
  useEffect(() => {
    if (glassRef.current && isReady) {
      glassRef.current.setBackgroundPattern(backgroundPattern);
    }
  }, [backgroundPattern, isReady]);

  // Update background image when prop changes
  useEffect(() => {
    if (glassRef.current && isReady && backgroundImage) {
      glassRef.current.setBackgroundTexture(backgroundImage);
    }
  }, [backgroundImage, isReady]);

  const handleResize = () => {
    if (glassRef.current) {
      glassRef.current.resize();
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          ...style
        }}
      />
      {error && (
        <div style={{ color: 'red', padding: '10px' }}>
          Error: {error}
        </div>
      )}
      {!isReady && !error && (
        <div style={{ padding: '10px' }}>
          Loading glass effects...
        </div>
      )}
    </div>
  );
};

// Example usage component with controls
export const GlassEffectDemo: React.FC = () => {
  const [shape, setShape] = useState<GlassShape>('sphere');
  const [pattern, setPattern] = useState<BackgroundPattern>('stripes');
  const [refractionIndex, setRefractionIndex] = useState(1.5);
  const [dispersion, setDispersion] = useState(0.03);
  
  const glassRef = useRef<PhysicsGlass | null>(null);

  const handleShapeChange = (newShape: GlassShape) => {
    setShape(newShape);
  };

  const handlePatternChange = (newPattern: BackgroundPattern) => {
    setPattern(newPattern);
  };

  const handleRefractionChange = (value: number) => {
    setRefractionIndex(value);
    if (glassRef.current) {
      glassRef.current.setRefractionIndex(value);
    }
  };

  const handleDispersionChange = (value: number) => {
    setDispersion(value);
    if (glassRef.current) {
      glassRef.current.setDispersion(value);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      <div style={{ flex: 1 }}>
        <GlassEffectComponent
          width={800}
          height={600}
          shape={shape}
          backgroundPattern={pattern}
          style={{ border: '1px solid #ccc' }}
        />
      </div>
      
      <div style={{ width: '300px', padding: '20px', background: '#f5f5f5' }}>
        <h3>Controls</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Glass Shape:</label>
          <select 
            value={shape} 
            onChange={(e) => handleShapeChange(e.target.value as GlassShape)}
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
          >
            <option value="sphere">Sphere</option>
            <option value="cylinder">Cylinder</option>
            <option value="lens">Convex Lens</option>
            <option value="prism">Triangular Prism</option>
            <option value="flat">Flat Glass</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Background Pattern:</label>
          <select 
            value={pattern} 
            onChange={(e) => handlePatternChange(e.target.value as BackgroundPattern)}
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
          >
            <option value="stripes">Black & White Stripes</option>
            <option value="grid">Grid Pattern</option>
            <option value="circles">Concentric Circles</option>
            <option value="texture">Nature Texture</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Refraction Index: {refractionIndex}</label>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={refractionIndex}
            onChange={(e) => handleRefractionChange(parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Chromatic Dispersion: {dispersion}</label>
          <input
            type="range"
            min="0.0"
            max="0.1"
            step="0.01"
            value={dispersion}
            onChange={(e) => handleDispersionChange(parseFloat(e.target.value))}
            style={{ width: '100%', marginTop: '5px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default GlassEffectComponent; 