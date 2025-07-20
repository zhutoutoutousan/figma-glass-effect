class GlassPhysicsRenderer {
    constructor() {
        this.canvas = document.getElementById('glassCanvas');
        this.gl = null;
        this.program = null;
        this.mousePos = { x: 0.5, y: 0.5 };
        this.time = 0;
        
        // Physics parameters - initialize with control values
        this.uniforms = {
            refractionIndex: 1.5,
            dispersion: 0.03,
            thickness: 0.3,
            glassSize: 0.2,
            glassShape: 0, // 0=sphere, 1=cylinder, 2=lens, 3=prism, 4=flat
            backgroundPattern: 0, // 0=stripes, 1=grid, 2=circles, 3=nature
            time: 0,
            mousePos: [0.5, 0.5],
            resolution: [0, 0]
        };
        
        // Background texture for realistic transparency
        this.backgroundTexture = null;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupWebGL();
        this.createBackgroundTexture();
        this.setupShaders();
        this.setupGeometry();
        this.setupEventListeners();
        this.setupControls();
        this.render();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.uniforms.resolution = [this.canvas.width, this.canvas.height];
    }
    
    setupWebGL() {
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }
        
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
    
    createBackgroundTexture() {
        // Create a texture from the background element
        this.backgroundTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);
        
        // Create a canvas to capture the background
        const bgCanvas = document.createElement('canvas');
        const bgCtx = bgCanvas.getContext('2d');
        bgCanvas.width = this.canvas.width;
        bgCanvas.height = this.canvas.height;
        
        // Get the background element and draw it
        const backgroundElement = document.querySelector('.background');
        const bgStyle = window.getComputedStyle(backgroundElement);
        const bgImage = bgStyle.backgroundImage;
        
        if (bgImage && bgImage !== 'none') {
            // Extract URL from CSS background-image
            const imageUrl = bgImage.slice(5, -2); // Remove 'url("' and '")'
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                // Draw the background image to cover the canvas
                const imgAspect = img.width / img.height;
                const canvasAspect = bgCanvas.width / bgCanvas.height;
                
                let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
                
                if (imgAspect > canvasAspect) {
                    // Image is wider - fit to height
                    drawHeight = bgCanvas.height;
                    drawWidth = drawHeight * imgAspect;
                    offsetX = (bgCanvas.width - drawWidth) / 2;
                } else {
                    // Image is taller - fit to width
                    drawWidth = bgCanvas.width;
                    drawHeight = drawWidth / imgAspect;
                    offsetY = (bgCanvas.height - drawHeight) / 2;
                }
                
                bgCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                
                // Upload to WebGL texture
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bgCanvas);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            };
            img.src = imageUrl;
        } else {
            // Fallback: create a simple gradient texture
            const pixels = new Uint8Array(256 * 256 * 4);
            for (let i = 0; i < 256; i++) {
                for (let j = 0; j < 256; j++) {
                    const index = (i * 256 + j) * 4;
                    pixels[index] = Math.floor(50 + i * 0.5);     // R
                    pixels[index + 1] = Math.floor(150 + i * 0.3); // G
                    pixels[index + 2] = Math.floor(80 + j * 0.4);  // B
                    pixels[index + 3] = 255;                       // A
                }
            }
            
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 256, 256, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        }
    }
    
    setupShaders() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_uv = (a_position + 1.0) * 0.5;
            }
        `;
        
        const fragmentShaderSource = `
            precision highp float;
            
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mousePos;
            uniform float u_refractionIndex;
            uniform float u_dispersion;
            uniform float u_thickness;
            uniform float u_glassSize;
            uniform float u_glassShape;
            uniform float u_backgroundPattern;
            uniform sampler2D u_backgroundTexture;
            
            varying vec2 v_uv;
            
            #define PI 3.14159265359
            
            // Noise function for surface perturbations
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for(int i = 0; i < 4; i++) {
                    value += amplitude * noise(p * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                return value;
            }
            
            // Ray-sphere intersection
            vec2 intersectSphere(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter, float radius) {
                vec3 oc = rayOrigin - sphereCenter;
                float b = dot(oc, rayDir);
                float c = dot(oc, oc) - radius * radius;
                float discriminant = b * b - c;
                
                if (discriminant < 0.0) return vec2(-1.0);
                
                float sqrt_discriminant = sqrt(discriminant);
                float t1 = -b - sqrt_discriminant;
                float t2 = -b + sqrt_discriminant;
                
                return vec2(t1, t2);
            }
            
            // Ray-cylinder intersection (infinite height)
            vec2 intersectCylinder(vec3 rayOrigin, vec3 rayDir, vec3 cylinderCenter, float radius) {
                vec2 ro = rayOrigin.xy - cylinderCenter.xy;
                vec2 rd = rayDir.xy;
                
                float a = dot(rd, rd);
                float b = 2.0 * dot(ro, rd);
                float c = dot(ro, ro) - radius * radius;
                
                float discriminant = b * b - 4.0 * a * c;
                if (discriminant < 0.0) return vec2(-1.0);
                
                float sqrt_discriminant = sqrt(discriminant);
                float t1 = (-b - sqrt_discriminant) / (2.0 * a);
                float t2 = (-b + sqrt_discriminant) / (2.0 * a);
                
                return vec2(t1, t2);
            }
            
            // Get sphere normal at point
            vec3 getSphereNormal(vec3 point, vec3 center) {
                return normalize(point - center);
            }
            
            // Get cylinder normal at point
            vec3 getCylinderNormal(vec3 point, vec3 center) {
                vec3 toPoint = point - center;
                return normalize(vec3(toPoint.xy, 0.0));
            }
            
            // 3D refraction using Snell's law
            vec3 refract3D(vec3 incident, vec3 normal, float eta) {
                float cosI = dot(-incident, normal);
                float sinT2 = eta * eta * (1.0 - cosI * cosI);
                
                if(sinT2 >= 1.0) {
                    // Total internal reflection
                    return reflect(incident, normal);
                }
                
                float cosT = sqrt(1.0 - sinT2);
                return eta * incident + (eta * cosI - cosT) * normal;
            }
            
            // Fresnel reflection coefficient
            float fresnel(float cosTheta, float n1, float n2) {
                float r0 = pow((n1 - n2) / (n1 + n2), 2.0);
                return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
            }
            
            // Generate different background patterns
            vec3 getBackgroundPattern(vec2 uv, float patternType) {
                if (patternType < 0.5) {
                    // Black and white stripes (like the user's image)
                    float stripeWidth = 0.1;
                    float stripe = step(0.5, mod(uv.x / stripeWidth, 1.0));
                    return vec3(stripe);
                } else if (patternType < 1.5) {
                    // Grid pattern
                    float gridSize = 0.05;
                    vec2 grid = step(0.5, mod(uv / gridSize, 1.0));
                    float pattern = max(grid.x, grid.y);
                    return vec3(pattern);
                } else if (patternType < 2.5) {
                    // Concentric circles
                    float dist = length(uv - 0.5);
                    float rings = sin(dist * 50.0) * 0.5 + 0.5;
                    return vec3(rings);
                } else {
                    // Nature pattern - sample from actual background texture
                    return texture2D(u_backgroundTexture, uv).rgb;
                }
            }
            
            // Ray trace through different glass shapes
            vec4 traceGlassShape(vec2 uv, vec2 mouseUV, float shapeType, float glassSize) {
                vec3 rayOrigin = vec3(uv, 2.0);
                vec3 rayDir = vec3(0.0, 0.0, -1.0);
                vec3 glassCenter = vec3(mouseUV, 0.0);
                
                vec2 intersections;
                vec3 normal1, normal2;
                vec3 enterPoint, exitPoint;
                
                // Different glass shapes
                if (shapeType < 0.5) {
                    // Sphere
                    intersections = intersectSphere(rayOrigin, rayDir, glassCenter, glassSize);
                    if (intersections.x < 0.0) return vec4(0.0);
                    
                    enterPoint = rayOrigin + rayDir * intersections.x;
                    exitPoint = rayOrigin + rayDir * intersections.y;
                    normal1 = getSphereNormal(enterPoint, glassCenter);
                    normal2 = -getSphereNormal(exitPoint, glassCenter);
                    
                } else if (shapeType < 1.5) {
                    // Cylinder
                    intersections = intersectCylinder(rayOrigin, rayDir, glassCenter, glassSize);
                    if (intersections.x < 0.0) return vec4(0.0);
                    
                    enterPoint = rayOrigin + rayDir * intersections.x;
                    exitPoint = rayOrigin + rayDir * intersections.y;
                    normal1 = getCylinderNormal(enterPoint, glassCenter);
                    normal2 = -getCylinderNormal(exitPoint, glassCenter);
                    
                } else if (shapeType < 2.5) {
                    // Convex lens (approximated as flattened sphere)
                    float lensRatio = 1.5;
                    vec3 lensCenter = vec3(mouseUV, 0.0);
                    intersections = intersectSphere(rayOrigin, rayDir, lensCenter, glassSize * lensRatio);
                    if (intersections.x < 0.0) return vec4(0.0);
                    
                    enterPoint = rayOrigin + rayDir * intersections.x;
                    exitPoint = rayOrigin + rayDir * intersections.y;
                    normal1 = getSphereNormal(enterPoint, lensCenter);
                    normal2 = -getSphereNormal(exitPoint, lensCenter);
                    
                    // Flatten the lens effect
                    normal1.z *= 0.3;
                    normal2.z *= 0.3;
                    normal1 = normalize(normal1);
                    normal2 = normalize(normal2);
                    
                } else if (shapeType < 3.5) {
                    // Triangular prism (simplified)
                    float dist = length(uv - mouseUV);
                    if (dist > glassSize) return vec4(0.0);
                    
                    // Create triangular shape effect
                    vec2 centered = uv - mouseUV;
                    float angle = atan(centered.y, centered.x);
                    float prismEffect = sin(angle * 3.0) * 0.3 + 0.7;
                    
                    if (dist > glassSize * prismEffect) return vec4(0.0);
                    
                    // Simplified prism normals
                    normal1 = normalize(vec3(sin(angle * 3.0), cos(angle * 3.0), 1.0));
                    normal2 = -normal1;
                    
                } else {
                    // Flat glass
                    float dist = length(uv - mouseUV);
                    if (dist > glassSize) return vec4(0.0);
                    
                    normal1 = vec3(0.0, 0.0, 1.0);
                    normal2 = vec3(0.0, 0.0, -1.0);
                }
                
                // Add surface perturbations
                vec3 perturbation = vec3(
                    fbm(uv * 20.0 + u_time * 0.1) * 0.02,
                    fbm(uv * 20.0 + u_time * 0.13) * 0.02,
                    0.0
                );
                normal1 = normalize(normal1 + perturbation);
                normal2 = normalize(normal2 + perturbation);
                
                return vec4(normal1, 1.0); // Return first normal for now
            }
            
            void main() {
                vec2 uv = v_uv;
                vec2 mouseUV = u_mousePos;
                
                vec4 glassInfo = traceGlassShape(uv, mouseUV, u_glassShape, u_glassSize);
                
                if (glassInfo.w < 0.5) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                    return;
                }
                
                vec3 normal = glassInfo.xyz;
                
                // Calculate view direction
                vec3 viewDir = vec3(0.0, 0.0, 1.0);
                float cosTheta = abs(dot(viewDir, normal));
                
                // Fresnel effect
                float fresnelTerm = fresnel(cosTheta, 1.0, u_refractionIndex);
                
                // Chromatic dispersion - different wavelengths refract differently
                float redEta = 1.0 / (u_refractionIndex - u_dispersion);
                float greenEta = 1.0 / u_refractionIndex;
                float blueEta = 1.0 / (u_refractionIndex + u_dispersion);
                
                // Calculate refracted rays for each color channel
                vec3 refractedR = refract3D(-viewDir, normal, redEta);
                vec3 refractedG = refract3D(-viewDir, normal, greenEta);
                vec3 refractedB = refract3D(-viewDir, normal, blueEta);
                
                // Calculate distortion based on glass geometry and thickness
                float distortionScale = u_thickness * 0.3;
                
                // For sphere and lens, create strong curvature distortion
                if (u_glassShape < 2.5) {
                    vec2 centerOffset = uv - mouseUV;
                    float distFromCenter = length(centerOffset);
                    float curvatureEffect = 1.0 + distFromCenter * distFromCenter * 2.0;
                    distortionScale *= curvatureEffect;
                }
                
                vec2 offsetR = refractedR.xy * distortionScale;
                vec2 offsetG = refractedG.xy * distortionScale;
                vec2 offsetB = refractedB.xy * distortionScale;
                
                // Sample background with strong geometric distortion
                vec3 bgColorR = getBackgroundPattern(uv + offsetR, u_backgroundPattern);
                vec3 bgColorG = getBackgroundPattern(uv + offsetG, u_backgroundPattern);
                vec3 bgColorB = getBackgroundPattern(uv + offsetB, u_backgroundPattern);
                
                vec3 refractedColor = vec3(bgColorR.r, bgColorG.g, bgColorB.b);
                
                // Reflection color
                vec3 reflectionColor = vec3(0.9, 0.95, 1.0);
                
                // Combine reflection and refraction
                vec3 finalColor = mix(refractedColor, reflectionColor, fresnelTerm);
                
                // Add caustic effects
                float caustic = pow(max(0.0, dot(normal, vec3(0.5, 0.5, 1.0))), 3.0);
                finalColor += caustic * 0.4 * vec3(1.0, 1.0, 0.9);
                
                // Glass transparency
                float dist = length(uv - mouseUV);
                float glassMask = smoothstep(u_glassSize + 0.02, u_glassSize - 0.02, dist);
                
                // Make glass more transparent to show background properly
                float alpha = glassMask * 0.4;
                
                // Edge enhancement for glass rim effect
                float edge = 1.0 - smoothstep(u_glassSize - 0.005, u_glassSize, dist);
                alpha += edge * 0.6;
                
                // Ensure the glass effect blends properly with background
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;
        
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        this.program = this.createProgram(vertexShader, fragmentShader);
        this.gl.useProgram(this.program);
        
        // Get uniform locations
        this.uniformLocations = {
            time: this.gl.getUniformLocation(this.program, 'u_time'),
            resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
            mousePos: this.gl.getUniformLocation(this.program, 'u_mousePos'),
            refractionIndex: this.gl.getUniformLocation(this.program, 'u_refractionIndex'),
            dispersion: this.gl.getUniformLocation(this.program, 'u_dispersion'),
            thickness: this.gl.getUniformLocation(this.program, 'u_thickness'),
            glassSize: this.gl.getUniformLocation(this.program, 'u_glassSize'),
            glassShape: this.gl.getUniformLocation(this.program, 'u_glassShape'),
            backgroundPattern: this.gl.getUniformLocation(this.program, 'u_backgroundPattern'),
            backgroundTexture: this.gl.getUniformLocation(this.program, 'u_backgroundTexture')
        };
    }
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }
    
    setupGeometry() {
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }
    
    setupEventListeners() {
        // Mouse tracking
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = (e.clientX - rect.left) / rect.width;
            this.mousePos.y = 1.0 - (e.clientY - rect.top) / rect.height;
        });
        
        // Resize handling
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        });
    }
    
    setupControls() {
        // Glass Shape control
        const glassShapeSelect = document.getElementById('glassShape');
        const shapeMap = {
            'sphere': 0,
            'cylinder': 1,
            'lens': 2,
            'prism': 3,
            'flat': 4
        };
        
        // Set initial value
        this.uniforms.glassShape = shapeMap[glassShapeSelect.value];
        
        glassShapeSelect.addEventListener('change', (e) => {
            this.uniforms.glassShape = shapeMap[e.target.value];
            console.log('Glass shape changed to:', e.target.value, '(', this.uniforms.glassShape, ')');
        });
        
        // Background Pattern control
        const backgroundPatternSelect = document.getElementById('backgroundPattern');
        const patternMap = {
            'stripes': 0,
            'grid': 1,
            'circles': 2,
            'nature': 3
        };
        
        // Set initial value
        this.uniforms.backgroundPattern = patternMap[backgroundPatternSelect.value];
        
        backgroundPatternSelect.addEventListener('change', (e) => {
            this.uniforms.backgroundPattern = patternMap[e.target.value];
            console.log('Background pattern changed to:', e.target.value, '(', this.uniforms.backgroundPattern, ')');
        });
        
        // Refraction Index control
        const refractionSlider = document.getElementById('refractionIndex');
        const refractionValue = document.getElementById('refractionValue');
        
        // Set initial value
        this.uniforms.refractionIndex = parseFloat(refractionSlider.value);
        refractionValue.textContent = refractionSlider.value;
        
        refractionSlider.addEventListener('input', (e) => {
            this.uniforms.refractionIndex = parseFloat(e.target.value);
            refractionValue.textContent = e.target.value;
        });
        
        // Dispersion control
        const dispersionSlider = document.getElementById('dispersion');
        const dispersionValue = document.getElementById('dispersionValue');
        
        // Set initial value
        this.uniforms.dispersion = parseFloat(dispersionSlider.value);
        dispersionValue.textContent = dispersionSlider.value;
        
        dispersionSlider.addEventListener('input', (e) => {
            this.uniforms.dispersion = parseFloat(e.target.value);
            dispersionValue.textContent = e.target.value;
        });
        
        // Thickness control
        const thicknessSlider = document.getElementById('thickness');
        const thicknessValue = document.getElementById('thicknessValue');
        
        // Set initial value
        this.uniforms.thickness = parseFloat(thicknessSlider.value);
        thicknessValue.textContent = thicknessSlider.value;
        
        thicknessSlider.addEventListener('input', (e) => {
            this.uniforms.thickness = parseFloat(e.target.value);
            thicknessValue.textContent = e.target.value;
        });
        
        // Glass Size control
        const glassSizeSlider = document.getElementById('glassSize');
        const glassSizeValue = document.getElementById('glassSizeValue');
        
        // Set initial value
        this.uniforms.glassSize = parseFloat(glassSizeSlider.value);
        glassSizeValue.textContent = glassSizeSlider.value;
        
        glassSizeSlider.addEventListener('input', (e) => {
            this.uniforms.glassSize = parseFloat(e.target.value);
            glassSizeValue.textContent = e.target.value;
        });
    }
    
    updateUniforms() {
        this.gl.uniform1f(this.uniformLocations.time, this.time);
        this.gl.uniform2f(this.uniformLocations.resolution, this.uniforms.resolution[0], this.uniforms.resolution[1]);
        this.gl.uniform2f(this.uniformLocations.mousePos, this.mousePos.x, this.mousePos.y);
        this.gl.uniform1f(this.uniformLocations.refractionIndex, this.uniforms.refractionIndex);
        this.gl.uniform1f(this.uniformLocations.dispersion, this.uniforms.dispersion);
        this.gl.uniform1f(this.uniformLocations.thickness, this.uniforms.thickness);
        this.gl.uniform1f(this.uniformLocations.glassSize, this.uniforms.glassSize);
        this.gl.uniform1f(this.uniformLocations.glassShape, this.uniforms.glassShape);
        this.gl.uniform1f(this.uniformLocations.backgroundPattern, this.uniforms.backgroundPattern);
        
        // Bind background texture
        if (this.backgroundTexture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture);
            this.gl.uniform1i(this.uniformLocations.backgroundTexture, 0);
        }
    }
    
    render() {
        this.time += 0.016; // ~60fps
        
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.updateUniforms();
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(() => this.render());
    }
    
    // Debug method to check current uniform values
    debugUniforms() {
        console.log('Current uniform values:', {
            glassShape: this.uniforms.glassShape,
            backgroundPattern: this.uniforms.backgroundPattern,
            refractionIndex: this.uniforms.refractionIndex,
            dispersion: this.uniforms.dispersion,
            thickness: this.uniforms.thickness,
            glassSize: this.uniforms.glassSize
        });
    }
}

// Button interaction enhancement
class ButtonInteraction {
    constructor() {
        this.button = document.getElementById('glassButton');
        this.setupInteractions();
    }
    
    setupInteractions() {
        this.button.addEventListener('click', () => {
            // Create ripple effect
            this.createRipple();
            
            // Physics demonstration
            this.demonstratePhysics();
        });
        
        this.button.addEventListener('mouseenter', () => {
            this.button.style.filter = 'brightness(1.2)';
        });
        
        this.button.addEventListener('mouseleave', () => {
            this.button.style.filter = 'brightness(1.0)';
        });
    }
    
    createRipple() {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            width: 10px;
            height: 10px;
            pointer-events: none;
            z-index: 10;
            animation: rippleExpand 0.6s ease-out;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes rippleExpand {
                from {
                    transform: scale(0);
                    opacity: 1;
                }
                to {
                    transform: scale(20);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        this.button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
            style.remove();
        }, 600);
    }
    
    demonstratePhysics() {
        // Cycle through different glass shapes and demonstrate their unique distortion properties
        const shapeSelect = document.getElementById('glassShape');
        const backgroundSelect = document.getElementById('backgroundPattern');
        const glassSizeSlider = document.getElementById('glassSize');
        
        const demonstrations = [
            { 
                name: 'Glass Sphere on Stripes', 
                shape: 'sphere', 
                background: 'stripes', 
                size: 0.15,
                refraction: 1.5,
                description: 'Notice the strong barrel distortion - stripes bend dramatically around the sphere\'s curvature'
            },
            { 
                name: 'Glass Cylinder on Grid', 
                shape: 'cylinder', 
                background: 'grid', 
                size: 0.2,
                refraction: 1.6,
                description: 'Cylindrical glass creates one-directional distortion - grid lines stretch horizontally'
            },
            { 
                name: 'Convex Lens on Circles', 
                shape: 'lens', 
                background: 'circles', 
                size: 0.18,
                refraction: 1.7,
                description: 'Lens focuses light, creating magnification at center and distortion at edges'
            },
            { 
                name: 'Triangular Prism Effect', 
                shape: 'prism', 
                background: 'stripes', 
                size: 0.25,
                refraction: 1.8,
                description: 'Prism creates directional refraction and strong chromatic dispersion'
            },
            { 
                name: 'Flat Glass with High Dispersion', 
                shape: 'flat', 
                background: 'nature', 
                size: 0.3,
                refraction: 2.0,
                description: 'Flat glass with minimal distortion but visible chromatic aberration'
            }
        ];
        
        let currentDemo = 0;
        const demonstrateNext = () => {
            if (currentDemo >= demonstrations.length) {
                console.log('🎯 Demonstration complete! Try different combinations manually.');
                return;
            }
            
            const demo = demonstrations[currentDemo];
            console.log(`🔬 ${demo.name}: ${demo.description}`);
            
            // Update controls
            shapeSelect.value = demo.shape;
            shapeSelect.dispatchEvent(new Event('change'));
            
            backgroundSelect.value = demo.background;
            backgroundSelect.dispatchEvent(new Event('change'));
            
            this.animateValue(glassSizeSlider, demo.size);
            this.animateValue(document.getElementById('refractionIndex'), demo.refraction);
            
            currentDemo++;
            setTimeout(demonstrateNext, 3000); // Longer time to observe the effects
        };
        
        demonstrateNext();
    }
    
    animateValue(slider, targetValue) {
        const startValue = parseFloat(slider.value);
        const difference = targetValue - startValue;
        const duration = 1000; // 1 second
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            const currentValue = startValue + difference * easeProgress;
            slider.value = currentValue;
            slider.dispatchEvent(new Event('input'));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
}

// Initialize everything when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const glassRenderer = new GlassPhysicsRenderer();
    const buttonInteraction = new ButtonInteraction();
    
    // Make renderer available for debugging
    window.glassRenderer = glassRenderer;
    
    console.log('🔬 Advanced Physics-based Glass Effect initialized!');
    console.log('🖱️  Move your mouse around to see realistic glass distortion');
    console.log('🎮 Click the button to cycle through different glass shapes and patterns');
    console.log('⚙️  Use the controls to adjust optical properties and shapes in real-time');
    console.log('🌟 Try the sphere on stripes to see dramatic geometric distortion like in your reference image!');
    console.log('🔧 Debug: Type "glassRenderer.debugUniforms()" in console to check uniform values');
    
    // Initial debug output
    setTimeout(() => glassRenderer.debugUniforms(), 1000);
}); 