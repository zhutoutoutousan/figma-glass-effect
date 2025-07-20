# Physics Glass Effects

[![npm version](https://badge.fury.io/js/physics-glass-effects.svg)](https://badge.fury.io/js/physics-glass-effects)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![WebGL](https://img.shields.io/badge/WebGL-Powered-green.svg)](https://www.khronos.org/webgl/)

A sophisticated WebGL library that creates realistic glass effects using genuine optical physics principles. Unlike typical "glassmorphism" effects, this library implements real physics including Snell's Law, Fresnel reflection, chromatic dispersion, and 3D ray tracing.

🔬 **Real Physics** • 🎨 **Multiple Shapes** • ⚡ **High Performance** • 🎯 **Framework Agnostic**

## ✨ Features

### 🔬 **Advanced Optical Physics**
- **3D Ray Tracing**: Accurate ray-object intersection for different glass geometries
- **Snell's Law**: Proper 3D refraction calculations through glass volumes
- **Fresnel Equations**: Realistic reflection/transmission ratios based on viewing angle
- **Chromatic Dispersion**: Different wavelengths (RGB) refract at different angles
- **Geometric Distortion**: Dramatic background distortion based on actual glass shape

### 🎨 **Multiple Glass Shapes**
- **Sphere**: Strong barrel distortion with curvature-dependent effects
- **Cylinder**: One-directional distortion creating unique stretching patterns
- **Convex Lens**: Magnification at center with edge distortion effects
- **Triangular Prism**: Directional refraction with enhanced chromatic separation
- **Flat Glass**: Minimal geometric distortion with pure optical effects

### 🌈 **Background Patterns**
- **Black & White Stripes**: Perfect for demonstrating geometric distortion
- **Grid Pattern**: Shows both horizontal and vertical distortion clearly
- **Concentric Circles**: Demonstrates radial distortion effects
- **Custom Textures**: Use your own images for realistic environmental refraction

### 🚀 **Framework Support**
- **React** - Full component support with hooks
- **Vue** - Complete composition API integration
- **Next.js** - SSR-safe with dynamic loading
- **Vanilla JS** - Zero dependencies, works anywhere
- **TypeScript** - Full type definitions included

## 📦 Installation

```bash
npm install physics-glass-effects
```

## 🚀 Quick Start

### Vanilla JavaScript
```javascript
import { PhysicsGlass } from 'physics-glass-effects';

const canvas = document.getElementById('canvas');
const glass = new PhysicsGlass(canvas, {
  shape: 'sphere',
  backgroundPattern: 'stripes',
  refractionIndex: 1.5,
  dispersion: 0.03
});
```

### React
```tsx
import React, { useRef, useEffect } from 'react';
import { PhysicsGlass } from 'physics-glass-effects';

const GlassEffect = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const glass = new PhysicsGlass(canvasRef.current, {
        shape: 'sphere',
        backgroundPattern: 'stripes',
        mouse: { enabled: true, followCursor: true },
        onReady: () => console.log('Glass effect ready!')
      });

      return () => glass.destroy();
    }
  }, []);

  return <canvas ref={canvasRef} width={800} height={600} />;
};
```

### Vue 3
```vue
<template>
  <canvas ref="canvasRef" :width="800" :height="600" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { PhysicsGlass } from 'physics-glass-effects';

const canvasRef = ref(null);
let glass = null;

onMounted(() => {
  if (canvasRef.value) {
    glass = new PhysicsGlass(canvasRef.value, {
      shape: 'sphere',
      backgroundPattern: 'stripes'
    });
  }
});

onUnmounted(() => {
  if (glass) glass.destroy();
});
</script>
```

### Next.js (SSR Safe)
```tsx
import dynamic from 'next/dynamic';

const GlassEffect = dynamic(
  () => import('./GlassEffectClient'),
  { ssr: false }
);

export default function Page() {
  return <GlassEffect width={800} height={600} />;
}
```

## 🎛️ Configuration Options

```typescript
interface PhysicsGlassConfig {
  // Glass properties
  shape?: 'sphere' | 'cylinder' | 'lens' | 'prism' | 'flat';
  size?: number; // 0.1 to 0.4
  refractionIndex?: number; // 1.0 to 2.5
  dispersion?: number; // 0.0 to 0.1
  thickness?: number; // 0.1 to 1.0
  
  // Background
  backgroundPattern?: 'stripes' | 'grid' | 'circles' | 'texture';
  backgroundTexture?: HTMLImageElement | HTMLCanvasElement | string;
  
  // Interaction
  mouse?: {
    enabled: boolean;
    followCursor: boolean;
    centerX?: number;
    centerY?: number;
  };
  
  // Animation
  animation?: {
    enabled: boolean;
    speed: number; // 0.0 to 5.0
    surfaceRipples: boolean;
  };
  
  // Callbacks
  onReady?: () => void;
  onError?: (error: Error) => void;
  onShapeChange?: (shape: GlassShape) => void;
}
```

## 🛠️ API Reference

### Main Class

#### `PhysicsGlass`

```typescript
class PhysicsGlass {
  constructor(canvas: HTMLCanvasElement | string, config?: PhysicsGlassConfig);
  
  // Shape and appearance
  setShape(shape: GlassShape): void;
  setSize(size: number): void;
  setBackgroundPattern(pattern: BackgroundPattern): void;
  setBackgroundTexture(texture: HTMLImageElement | HTMLCanvasElement | string): Promise<void>;
  
  // Optical properties
  setRefractionIndex(index: number): void;
  setDispersion(dispersion: number): void;
  setThickness(thickness: number): void;
  
  // Material presets
  setMaterial(material: GlassMaterial | string): void;
  getMaterials(): GlassMaterial[];
  
  // Interaction
  setMousePosition(x: number, y: number): void;
  enableMouseTracking(enabled: boolean): void;
  
  // Animation
  startAnimation(): void;
  stopAnimation(): void;
  setAnimationSpeed(speed: number): void;
  
  // Lifecycle
  destroy(): void;
  resize(): void;
  
  // Utility
  getConfig(): PhysicsGlassConfig;
  getCanvas(): HTMLCanvasElement;
  isWebGLSupported(): boolean;
}
```

### Material Presets

```typescript
const materials = {
  water: { refractionIndex: 1.33, dispersion: 0.01 },
  crownGlass: { refractionIndex: 1.52, dispersion: 0.02 },
  flintGlass: { refractionIndex: 1.65, dispersion: 0.05 },
  diamond: { refractionIndex: 2.42, dispersion: 0.08 }
};

// Usage
glass.setMaterial('diamond');
// or
glass.setMaterial(materials.diamond);
```

### Utility Functions

```typescript
import { isWebGLSupported, GLASS_MATERIALS } from 'physics-glass-effects';

if (!isWebGLSupported()) {
  console.log('WebGL not supported');
}

console.log(GLASS_MATERIALS.diamond); // { name: 'Diamond', refractionIndex: 2.42, ... }
```

## 🎯 Usage Examples

### Dynamic Shape Switching
```javascript
const glass = new PhysicsGlass(canvas);

// Switch between different glass shapes
glass.setShape('sphere');    // Strong barrel distortion
glass.setShape('cylinder');  // Unidirectional stretching
glass.setShape('lens');      // Magnification effects
glass.setShape('prism');     // Rainbow dispersion
```

### Material Demonstrations
```javascript
// Cycle through different materials
const materials = ['water', 'crownGlass', 'flintGlass', 'diamond'];
let currentMaterial = 0;

setInterval(() => {
  glass.setMaterial(materials[currentMaterial]);
  currentMaterial = (currentMaterial + 1) % materials.length;
}, 2000);
```

### Custom Background Textures
```javascript
// Using an image URL
glass.setBackgroundTexture('https://example.com/texture.jpg');

// Using an Image element
const img = new Image();
img.onload = () => glass.setBackgroundTexture(img);
img.src = 'texture.jpg';

// Using a canvas
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// ... draw on canvas ...
glass.setBackgroundTexture(canvas);
```

### Interactive Controls
```javascript
// Mouse position control
glass.enableMouseTracking(false);
glass.setMousePosition(0.3, 0.7); // 30% from left, 70% from top

// Animation control
glass.setAnimationSpeed(2.0); // 2x speed
glass.stopAnimation();
glass.startAnimation();
```

## 🔬 Physics Deep Dive

### Real Optical Equations

The library implements authentic physics equations:

**Snell's Law**: `n₁ sin θ₁ = n₂ sin θ₂`
```glsl
vec3 refract3D(vec3 incident, vec3 normal, float eta) {
    float cosI = dot(-incident, normal);
    float sinT2 = eta * eta * (1.0 - cosI * cosI);
    if(sinT2 >= 1.0) return reflect(incident, normal); // Total internal reflection
    float cosT = sqrt(1.0 - sinT2);
    return eta * incident + (eta * cosI - cosT) * normal;
}
```

**Fresnel Equations**: `R = R₀ + (1 - R₀)(1 - cos θ)⁵`
```glsl
float fresnel(float cosTheta, float n1, float n2) {
    float r0 = pow((n1 - n2) / (n1 + n2), 2.0);
    return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}
```

### Shape-Specific Distortions

Each glass shape creates unique distortion patterns:

- **Sphere**: Barrel distortion increases quadratically from center
- **Cylinder**: Uniform stretching in one direction only
- **Lens**: Radial magnification with focal point effects
- **Prism**: Angular refraction creating rainbow separation

## ⚡ Performance

- **Hardware Accelerated**: Uses WebGL for 60fps rendering
- **Optimized Shaders**: Single-pass fragment shader rendering
- **Memory Efficient**: Automatic resource cleanup
- **Responsive**: Real-time parameter updates

### Browser Support

- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari (with WebGL enabled)
- ✅ Edge
- ❌ Internet Explorer

## 🐛 Troubleshooting

### Common Issues

**WebGL not supported:**
```javascript
import { isWebGLSupported } from 'physics-glass-effects';

if (!isWebGLSupported()) {
  // Show fallback UI
  console.warn('WebGL not supported, showing fallback');
}
```

**Canvas sizing issues:**
```javascript
// Ensure proper canvas sizing
const glass = new PhysicsGlass(canvas, {
  performance: {
    pixelRatio: window.devicePixelRatio || 1
  }
});

// Handle resize
window.addEventListener('resize', () => glass.resize());
```

**Memory leaks:**
```javascript
// Always cleanup when component unmounts
useEffect(() => {
  const glass = new PhysicsGlass(canvas);
  return () => glass.destroy(); // Critical!
}, []);
```

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/physics-glass-effects)
- [Live Demo](https://physics-glass-effects.vercel.app)
- [Documentation](https://docs.physics-glass-effects.com)
- [NPM Package](https://www.npmjs.com/package/physics-glass-effects)

---

**Made with ❤️ by developers who believe in the beauty of real physics** 