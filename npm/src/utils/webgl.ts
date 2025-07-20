import { PhysicsGlassError, ERROR_CODES } from '../types';

/**
 * Check if WebGL is supported in the current browser
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!context;
  } catch (e) {
    return false;
  }
}

/**
 * Get WebGL context with proper fallbacks
 */
export function getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
  const contextOptions = {
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'default' as const,
  };

  let gl: WebGLRenderingContext | null = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext;
  if (!gl) {
    gl = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext;
  }
  if (!gl) {
    gl = canvas.getContext('experimental-webgl', contextOptions) as WebGLRenderingContext;
  }

  if (!gl) {
    throw new PhysicsGlassError(
      'WebGL is not supported in this browser',
      ERROR_CODES.WEBGL_NOT_SUPPORTED
    );
  }

  return gl;
}

/**
 * Compile a shader from source code
 */
export function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new PhysicsGlassError(
      'Failed to create shader',
      ERROR_CODES.SHADER_COMPILATION_FAILED
    );
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new PhysicsGlassError(
      `Shader compilation failed: ${info}`,
      ERROR_CODES.SHADER_COMPILATION_FAILED
    );
  }

  return shader;
}

/**
 * Create and link a WebGL program
 */
export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new PhysicsGlassError(
      'Failed to create shader program',
      ERROR_CODES.SHADER_COMPILATION_FAILED
    );
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new PhysicsGlassError(
      `Program linking failed: ${info}`,
      ERROR_CODES.SHADER_COMPILATION_FAILED
    );
  }

  return program;
}

/**
 * Create a texture from an image or canvas element
 */
export function createTextureFromElement(
  gl: WebGLRenderingContext,
  element: HTMLImageElement | HTMLCanvasElement
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new PhysicsGlassError(
      'Failed to create texture',
      ERROR_CODES.TEXTURE_LOAD_FAILED
    );
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

/**
 * Load an image and create a texture from it
 */
export function loadImageTexture(
  gl: WebGLRenderingContext,
  url: string
): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    image.onload = () => {
      try {
        const texture = createTextureFromElement(gl, image);
        resolve(texture);
      } catch (error) {
        reject(error);
      }
    };
    
    image.onerror = () => {
      reject(new PhysicsGlassError(
        `Failed to load image: ${url}`,
        ERROR_CODES.TEXTURE_LOAD_FAILED
      ));
    };
    
    image.src = url;
  });
}

/**
 * Create a default fallback texture with a gradient
 */
export function createDefaultTexture(gl: WebGLRenderingContext): WebGLTexture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 256;

  // Create a simple gradient
  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, '#2d4a3d');
  gradient.addColorStop(0.5, '#4a7c59');
  gradient.addColorStop(1, '#6ba368');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  return createTextureFromElement(gl, canvas);
}

/**
 * Get all uniform locations for a program
 */
export function getUniformLocations(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  uniforms: string[]
): Record<string, WebGLUniformLocation | null> {
  const locations: Record<string, WebGLUniformLocation | null> = {};
  
  for (const uniform of uniforms) {
    locations[uniform] = gl.getUniformLocation(program, uniform);
  }
  
  return locations;
}

/**
 * Set up vertex buffer for a fullscreen quad
 */
export function createQuadBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
  ]);

  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new PhysicsGlassError(
      'Failed to create vertex buffer',
      ERROR_CODES.WEBGL_NOT_SUPPORTED
    );
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  return buffer;
}

/**
 * Handle WebGL context loss and restoration
 */
export function setupContextLossHandling(
  canvas: HTMLCanvasElement,
  onContextLost: () => void,
  onContextRestored: () => void
): () => void {
  const handleContextLost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };

  const handleContextRestored = () => {
    onContextRestored();
  };

  canvas.addEventListener('webglcontextlost', handleContextLost, false);
  canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
  };
} 