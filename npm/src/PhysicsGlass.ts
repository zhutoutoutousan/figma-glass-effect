import {
  PhysicsGlassConfig,
  PhysicsGlassAPI,
  GlassShape,
  BackgroundPattern,
  GlassMaterial,
  ShaderUniforms,
  WebGLState,
  PhysicsGlassError,
  ERROR_CODES,
  GLASS_MATERIALS
} from './types';

import {
  isWebGLSupported,
  getWebGLContext,
  createShader,
  createProgram,
  createTextureFromElement,
  loadImageTexture,
  createDefaultTexture,
  getUniformLocations,
  createQuadBuffer,
  setupContextLossHandling
} from './utils/webgl';

import { vertexShaderSource } from './shaders/vertex.glsl';
import { fragmentShaderSource } from './shaders/fragment.glsl';

const DEFAULT_CONFIG: Required<PhysicsGlassConfig> = {
  shape: 'sphere',
  size: 0.15,
  refractionIndex: 1.5,
  dispersion: 0.03,
  thickness: 0.3,
  backgroundPattern: 'stripes',
  backgroundTexture: '',
  mouse: {
    enabled: true,
    followCursor: true,
    centerX: 0.5,
    centerY: 0.5
  },
  animation: {
    enabled: true,
    speed: 1.0,
    surfaceRipples: true
  },
  performance: {
    pixelRatio: window.devicePixelRatio || 1,
    antialias: true,
    preserveDrawingBuffer: false,
    premultipliedAlpha: false
  },
  onReady: () => {},
  onError: () => {},
  onShapeChange: () => {},
  onMaterialChange: () => {}
};

export class PhysicsGlass implements PhysicsGlassAPI {
  private canvas: HTMLCanvasElement;
  private config: Required<PhysicsGlassConfig>;
  private webglState: WebGLState | null = null;
  private animationId: number | null = null;
  private isDestroyed = false;
  private time = 0;
  private mousePos = { x: 0.5, y: 0.5 };
  private uniforms: ShaderUniforms;
  private cleanupContextLoss?: () => void;
  private vertexBuffer?: WebGLBuffer;

  constructor(canvas: HTMLCanvasElement | string, config: PhysicsGlassConfig = {}) {
    // Get canvas element
    if (typeof canvas === 'string') {
      const element = document.querySelector(canvas) as HTMLCanvasElement;
      if (!element) {
        throw new PhysicsGlassError(
          `Canvas element not found: ${canvas}`,
          ERROR_CODES.CANVAS_NOT_FOUND
        );
      }
      this.canvas = element;
    } else {
      this.canvas = canvas;
    }

    // Merge configuration with defaults
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Validate configuration
    this.validateConfig();

    // Initialize uniforms
    this.uniforms = {
      time: 0,
      resolution: [this.canvas.width, this.canvas.height],
      mousePos: [this.config.mouse.centerX!, this.config.mouse.centerY!],
      refractionIndex: this.config.refractionIndex,
      dispersion: this.config.dispersion,
      thickness: this.config.thickness,
      glassSize: this.config.size,
      glassShape: this.getShapeIndex(this.config.shape),
      backgroundPattern: this.getPatternIndex(this.config.backgroundPattern)
    };

    // Initialize
    this.init();
  }

  private validateConfig(): void {
    if (this.config.size <= 0 || this.config.size > 1) {
      throw new PhysicsGlassError(
        'Glass size must be between 0 and 1',
        ERROR_CODES.INVALID_CONFIGURATION
      );
    }

    if (this.config.refractionIndex < 1 || this.config.refractionIndex > 3) {
      throw new PhysicsGlassError(
        'Refraction index must be between 1 and 3',
        ERROR_CODES.INVALID_CONFIGURATION
      );
    }
  }

  private async init(): Promise<void> {
    try {
      if (!isWebGLSupported()) {
        throw new PhysicsGlassError(
          'WebGL is not supported',
          ERROR_CODES.WEBGL_NOT_SUPPORTED
        );
      }

      await this.setupWebGL();
      this.setupCanvas();
      this.setupEventListeners();
      
      if (this.config.animation.enabled) {
        this.startAnimation();
      }

      this.config.onReady();
    } catch (error) {
      this.config.onError(error as Error);
      throw error;
    }
  }

  private async setupWebGL(): Promise<void> {
    const gl = getWebGLContext(this.canvas);
    
    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    // Get uniform locations
    const uniformNames = [
      'u_time', 'u_resolution', 'u_mousePos', 'u_refractionIndex',
      'u_dispersion', 'u_thickness', 'u_glassSize', 'u_glassShape',
      'u_backgroundPattern', 'u_backgroundTexture'
    ];
    const uniformLocations = getUniformLocations(gl, program, uniformNames);

    // Create vertex buffer
    this.vertexBuffer = createQuadBuffer(gl);
    
    // Set up vertex attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Create background texture
    let backgroundTexture: WebGLTexture;
    if (this.config.backgroundTexture) {
      if (typeof this.config.backgroundTexture === 'string') {
        backgroundTexture = await loadImageTexture(gl, this.config.backgroundTexture);
      } else {
        backgroundTexture = createTextureFromElement(gl, this.config.backgroundTexture);
      }
    } else {
      backgroundTexture = createDefaultTexture(gl);
    }

    // Set up WebGL state
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.webglState = {
      gl,
      program,
      uniformLocations,
      backgroundTexture
    };
  }

  private setupCanvas(): void {
    const { pixelRatio } = this.config.performance;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * pixelRatio!;
    this.canvas.height = rect.height * pixelRatio!;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.uniforms.resolution = [this.canvas.width, this.canvas.height];

    if (this.webglState) {
      this.webglState.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private setupEventListeners(): void {
    // Mouse tracking
    if (this.config.mouse.enabled && this.config.mouse.followCursor) {
      this.canvas.addEventListener('mousemove', this.handleMouseMove);
      this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    }

    // Resize handling
    window.addEventListener('resize', this.handleResize);

    // Context loss handling
    this.cleanupContextLoss = setupContextLossHandling(
      this.canvas,
      this.handleContextLoss,
      this.handleContextRestored
    );
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.config.mouse.followCursor) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = (event.clientX - rect.left) / rect.width;
    this.mousePos.y = 1.0 - (event.clientY - rect.top) / rect.height;
    this.uniforms.mousePos = [this.mousePos.x, this.mousePos.y];
  };

  private handleMouseLeave = (): void => {
    this.mousePos.x = this.config.mouse.centerX!;
    this.mousePos.y = this.config.mouse.centerY!;
    this.uniforms.mousePos = [this.mousePos.x, this.mousePos.y];
  };

  private handleResize = (): void => {
    this.setupCanvas();
  };

  private handleContextLoss = (): void => {
    this.stopAnimation();
  };

  private handleContextRestored = (): void => {
    this.setupWebGL().then(() => {
      if (this.config.animation.enabled) {
        this.startAnimation();
      }
    });
  };

  private getShapeIndex(shape: GlassShape): number {
    const shapes = ['sphere', 'cylinder', 'lens', 'prism', 'flat'];
    return shapes.indexOf(shape);
  }

  private getPatternIndex(pattern: BackgroundPattern): number {
    const patterns = ['stripes', 'grid', 'circles', 'texture'];
    return patterns.indexOf(pattern);
  }

  private updateUniforms(): void {
    if (!this.webglState) return;

    const { gl, uniformLocations } = this.webglState;

    gl.uniform1f(uniformLocations.u_time, this.uniforms.time);
    gl.uniform2f(uniformLocations.u_resolution, ...this.uniforms.resolution);
    gl.uniform2f(uniformLocations.u_mousePos, ...this.uniforms.mousePos);
    gl.uniform1f(uniformLocations.u_refractionIndex, this.uniforms.refractionIndex);
    gl.uniform1f(uniformLocations.u_dispersion, this.uniforms.dispersion);
    gl.uniform1f(uniformLocations.u_thickness, this.uniforms.thickness);
    gl.uniform1f(uniformLocations.u_glassSize, this.uniforms.glassSize);
    gl.uniform1f(uniformLocations.u_glassShape, this.uniforms.glassShape);
    gl.uniform1f(uniformLocations.u_backgroundPattern, this.uniforms.backgroundPattern);

    // Bind texture
    if (this.webglState.backgroundTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.webglState.backgroundTexture);
      gl.uniform1i(uniformLocations.u_backgroundTexture, 0);
    }
  }

  private render = (): void => {
    if (this.isDestroyed || !this.webglState) return;

    this.time += 0.016 * this.config.animation.speed;
    this.uniforms.time = this.time;

    const { gl } = this.webglState;
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.updateUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (this.config.animation.enabled) {
      this.animationId = requestAnimationFrame(this.render);
    }
  };

  // Public API methods
  public setShape(shape: GlassShape): void {
    this.config.shape = shape;
    this.uniforms.glassShape = this.getShapeIndex(shape);
    this.config.onShapeChange(shape);
  }

  public setSize(size: number): void {
    this.config.size = Math.max(0.01, Math.min(1, size));
    this.uniforms.glassSize = this.config.size;
  }

  public setRefractionIndex(index: number): void {
    this.config.refractionIndex = Math.max(1, Math.min(3, index));
    this.uniforms.refractionIndex = this.config.refractionIndex;
  }

  public setDispersion(dispersion: number): void {
    this.config.dispersion = Math.max(0, Math.min(0.2, dispersion));
    this.uniforms.dispersion = this.config.dispersion;
  }

  public setThickness(thickness: number): void {
    this.config.thickness = Math.max(0.1, Math.min(2, thickness));
    this.uniforms.thickness = this.config.thickness;
  }

  public setBackgroundPattern(pattern: BackgroundPattern): void {
    this.config.backgroundPattern = pattern;
    this.uniforms.backgroundPattern = this.getPatternIndex(pattern);
  }

  public async setBackgroundTexture(
    texture: HTMLImageElement | HTMLCanvasElement | string
  ): Promise<void> {
    if (!this.webglState) return;

    try {
      let newTexture: WebGLTexture;
      
      if (typeof texture === 'string') {
        newTexture = await loadImageTexture(this.webglState.gl, texture);
      } else {
        newTexture = createTextureFromElement(this.webglState.gl, texture);
      }

      // Clean up old texture
      if (this.webglState.backgroundTexture) {
        this.webglState.gl.deleteTexture(this.webglState.backgroundTexture);
      }

      this.webglState.backgroundTexture = newTexture;
      this.config.backgroundTexture = texture;
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  public setMaterial(material: GlassMaterial | string): void {
    const mat = typeof material === 'string' ? GLASS_MATERIALS[material] : material;
    if (!mat) return;

    this.setRefractionIndex(mat.refractionIndex);
    this.setDispersion(mat.dispersion);
    this.config.onMaterialChange(mat);
  }

  public getMaterials(): GlassMaterial[] {
    return Object.values(GLASS_MATERIALS);
  }

  public setMousePosition(x: number, y: number): void {
    this.mousePos.x = Math.max(0, Math.min(1, x));
    this.mousePos.y = Math.max(0, Math.min(1, y));
    this.uniforms.mousePos = [this.mousePos.x, this.mousePos.y];
  }

  public enableMouseTracking(enabled: boolean): void {
    this.config.mouse.enabled = enabled;
    if (!enabled) {
      this.setMousePosition(this.config.mouse.centerX!, this.config.mouse.centerY!);
    }
  }

  public startAnimation(): void {
    this.config.animation.enabled = true;
    if (!this.animationId) {
      this.render();
    }
  }

  public stopAnimation(): void {
    this.config.animation.enabled = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public setAnimationSpeed(speed: number): void {
    this.config.animation.speed = Math.max(0, Math.min(5, speed));
  }

  public resize(): void {
    this.handleResize();
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.stopAnimation();

    // Remove event listeners
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    window.removeEventListener('resize', this.handleResize);
    
    if (this.cleanupContextLoss) {
      this.cleanupContextLoss();
    }

    // Clean up WebGL resources
    if (this.webglState) {
      const { gl } = this.webglState;
      
      if (this.webglState.backgroundTexture) {
        gl.deleteTexture(this.webglState.backgroundTexture);
      }
      
      if (this.vertexBuffer) {
        gl.deleteBuffer(this.vertexBuffer);
      }
      
      if (this.webglState.program) {
        gl.deleteProgram(this.webglState.program);
      }
    }

    this.webglState = null;
  }

  public getConfig(): PhysicsGlassConfig {
    return { ...this.config };
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public isWebGLSupported(): boolean {
    return isWebGLSupported();
  }
} 