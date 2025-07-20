/**
 * Glass shape types available in the physics engine
 */
export type GlassShape = 'sphere' | 'cylinder' | 'lens' | 'prism' | 'flat';

/**
 * Background pattern types for demonstrating distortion effects
 */
export type BackgroundPattern = 'stripes' | 'grid' | 'circles' | 'texture';

/**
 * Glass material presets with realistic optical properties
 */
export interface GlassMaterial {
  name: string;
  refractionIndex: number;
  dispersion: number;
  description: string;
}

/**
 * Mouse interaction configuration
 */
export interface MouseConfig {
  enabled: boolean;
  followCursor: boolean;
  centerX?: number;
  centerY?: number;
}

/**
 * Rendering performance configuration
 */
export interface PerformanceConfig {
  pixelRatio?: number;
  antialias?: boolean;
  preserveDrawingBuffer?: boolean;
  premultipliedAlpha?: boolean;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  enabled: boolean;
  speed: number;
  surfaceRipples: boolean;
}

/**
 * Complete configuration object for PhysicsGlass
 */
export interface PhysicsGlassConfig {
  // Glass properties
  shape?: GlassShape;
  size?: number;
  refractionIndex?: number;
  dispersion?: number;
  thickness?: number;
  
  // Background
  backgroundPattern?: BackgroundPattern;
  backgroundTexture?: HTMLImageElement | HTMLCanvasElement | string;
  
  // Interaction
  mouse?: MouseConfig;
  
  // Animation
  animation?: AnimationConfig;
  
  // Performance
  performance?: PerformanceConfig;
  
  // Callbacks
  onReady?: () => void;
  onError?: (error: Error) => void;
  onShapeChange?: (shape: GlassShape) => void;
  onMaterialChange?: (material: GlassMaterial) => void;
}

/**
 * Internal uniform values passed to shaders
 */
export interface ShaderUniforms {
  time: number;
  resolution: [number, number];
  mousePos: [number, number];
  refractionIndex: number;
  dispersion: number;
  thickness: number;
  glassSize: number;
  glassShape: number;
  backgroundPattern: number;
}

/**
 * WebGL context and program management
 */
export interface WebGLState {
  gl: WebGL2RenderingContext | WebGLRenderingContext;
  program: WebGLProgram;
  uniformLocations: Record<string, WebGLUniformLocation | null>;
  backgroundTexture: WebGLTexture | null;
}

/**
 * Canvas lifecycle events
 */
export interface CanvasEvents {
  resize: () => void;
  mousemove: (event: MouseEvent) => void;
  mouseenter: (event: MouseEvent) => void;
  mouseleave: (event: MouseEvent) => void;
  contextlost: (event: WebGLContextEvent) => void;
  contextrestored: (event: WebGLContextEvent) => void;
}

/**
 * Public API methods for the PhysicsGlass instance
 */
export interface PhysicsGlassAPI {
  // Configuration methods
  setShape(shape: GlassShape): void;
  setSize(size: number): void;
  setRefractionIndex(index: number): void;
  setDispersion(dispersion: number): void;
  setThickness(thickness: number): void;
  setBackgroundPattern(pattern: BackgroundPattern): void;
  setBackgroundTexture(texture: HTMLImageElement | HTMLCanvasElement | string): Promise<void>;
  
  // Material presets
  setMaterial(material: GlassMaterial | string): void;
  getMaterials(): GlassMaterial[];
  
  // Mouse interaction
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

/**
 * Predefined glass materials with realistic properties
 */
export const GLASS_MATERIALS: Record<string, GlassMaterial> = {
  water: {
    name: 'Water',
    refractionIndex: 1.33,
    dispersion: 0.01,
    description: 'Clear water with minimal dispersion'
  },
  crownGlass: {
    name: 'Crown Glass',
    refractionIndex: 1.52,
    dispersion: 0.02,
    description: 'Standard optical glass used in windows and lenses'
  },
  flintGlass: {
    name: 'Flint Glass',
    refractionIndex: 1.65,
    dispersion: 0.05,
    description: 'Dense glass with high dispersion for prisms'
  },
  diamond: {
    name: 'Diamond',
    refractionIndex: 2.42,
    dispersion: 0.08,
    description: 'Extremely high refraction creating brilliant effects'
  },
  acrylic: {
    name: 'Acrylic',
    refractionIndex: 1.49,
    dispersion: 0.015,
    description: 'Lightweight plastic with glass-like properties'
  }
};

/**
 * Error types that can be thrown by the library
 */
export class PhysicsGlassError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PhysicsGlassError';
  }
}

export const ERROR_CODES = {
  WEBGL_NOT_SUPPORTED: 'WEBGL_NOT_SUPPORTED',
  CANVAS_NOT_FOUND: 'CANVAS_NOT_FOUND',
  SHADER_COMPILATION_FAILED: 'SHADER_COMPILATION_FAILED',
  TEXTURE_LOAD_FAILED: 'TEXTURE_LOAD_FAILED',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION'
} as const; 