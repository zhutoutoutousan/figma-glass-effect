// Main export
export { PhysicsGlass } from './PhysicsGlass';

// Types and interfaces
export type {
  PhysicsGlassConfig,
  PhysicsGlassAPI,
  GlassShape,
  BackgroundPattern,
  GlassMaterial,
  MouseConfig,
  PerformanceConfig,
  AnimationConfig
} from './types';

// Constants and utilities
export {
  GLASS_MATERIALS,
  PhysicsGlassError,
  ERROR_CODES
} from './types';

// Utility functions
export {
  isWebGLSupported
} from './utils/webgl';

// Default export for convenience
export { PhysicsGlass as default } from './PhysicsGlass'; 