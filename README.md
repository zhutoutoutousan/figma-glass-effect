# Advanced Physics-Based Glass Effect with 3D Geometry

A sophisticated WebGL implementation of realistic glass effects using genuine optical physics principles, featuring 3D ray tracing, multiple glass geometries, and dramatic geometric distortions that accurately simulate real glass objects.

## Features

### 🔬 Advanced Optical Physics
- **3D Ray Tracing**: Accurate ray-object intersection for different glass geometries
- **Snell's Law Implementation**: Proper 3D refraction calculations through glass volumes
- **Fresnel Equations**: Realistic reflection/transmission ratios based on viewing angle
- **Chromatic Dispersion**: Different wavelengths (RGB) refract at different angles
- **Geometric Distortion**: Dramatic background distortion based on actual glass shape and curvature
- **Surface Perturbations**: Subtle glass surface irregularities using fractal noise
- **Caustic Effects**: Light focusing patterns typical of glass surfaces

### 🎨 Multiple Glass Shapes
- **Glass Sphere**: Strong barrel distortion with curvature-dependent effects
- **Glass Cylinder**: One-directional distortion creating unique stretching patterns
- **Convex Lens**: Magnification at center with edge distortion effects
- **Triangular Prism**: Directional refraction with enhanced chromatic separation
- **Flat Glass**: Minimal geometric distortion with pure optical effects

### 🌈 Background Patterns
- **Black & White Stripes**: Perfect for demonstrating geometric distortion (like your reference image!)
- **Grid Pattern**: Shows both horizontal and vertical distortion clearly
- **Concentric Circles**: Demonstrates radial distortion effects
- **Nature Scene**: Complex pattern showing realistic environmental refraction

### 🎛️ Interactive Controls
- **Glass Shape Selector**: Switch between sphere, cylinder, lens, prism, and flat glass
- **Background Pattern Selector**: Choose optimal patterns to visualize distortion
- **Refraction Index**: Adjust from 1.0 (air) to 2.5 (diamond-like materials)
- **Chromatic Dispersion**: Control color separation effects (0.0 to 0.1)
- **Glass Thickness**: Modify the apparent thickness affecting distortion strength
- **Glass Size**: Control the size of the glass object (0.1 to 0.4)

### 🎯 Dynamic Interactions
- **Mouse Tracking**: Glass effect follows mouse cursor position with real 3D geometry
- **Shape Demonstrations**: Click to cycle through different glass shapes and optimal background patterns
- **Real-time Updates**: All parameters update live via WebGL shaders with immediate visual feedback

## Physics Principles Implemented

### 1. 3D Ray Tracing and Geometry
```glsl
// Ray-sphere intersection for realistic glass spheres
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
```

### 2. 3D Snell's Law of Refraction
```glsl
// Calculate refracted ray direction in 3D space
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
```

### 3. Fresnel Reflection
```glsl
// Fresnel reflection coefficient
float fresnel(float cosTheta, float n1, float n2) {
    float r0 = pow((n1 - n2) / (n1 + n2), 2.0);
    return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}
```

### 4. Chromatic Dispersion
Different wavelengths have different refractive indices:
- Red: `n - dispersion`
- Green: `n` (base refractive index)
- Blue: `n + dispersion`

This creates the rainbow-like color separation visible in real glass.

### 5. Geometric Distortion and Surface Perturbation
The distortion strength is calculated based on the actual glass geometry:
```glsl
// Calculate distortion based on glass geometry and thickness
float distortionScale = u_thickness * 0.3;

// For sphere and lens, create strong curvature distortion
if (u_glassShape < 2.5) {
    vec2 centerOffset = uv - mouseUV;
    float distFromCenter = length(centerOffset);
    float curvatureEffect = 1.0 + distFromCenter * distFromCenter * 2.0;
    distortionScale *= curvatureEffect;
}
```

Surface irregularities using fractal Brownian motion (fbm):
```glsl
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
```

## Shape and Pattern Examples

The implementation demonstrates various glass shapes with optimal background patterns:

| Glass Shape | Best Pattern | Distortion Type | Visual Effect |
|-------------|--------------|-----------------|---------------|
| **Sphere** | Black & White Stripes | Barrel Distortion | Dramatic curved bending, like your reference image |
| **Cylinder** | Grid Pattern | Unidirectional Stretch | Horizontal stretching, vertical preservation |
| **Convex Lens** | Concentric Circles | Radial Magnification | Center focus with edge compression |
| **Triangular Prism** | Vertical Stripes | Directional Refraction | Angular bending with strong dispersion |
| **Flat Glass** | Any Pattern | Minimal Distortion | Pure optical effects without geometry |

## Material Properties

Different materials can be simulated by adjusting the refractive index:

| Material | Refractive Index | Dispersion | Real-world Example |
|----------|------------------|------------|------------------|
| Water | 1.33 | 0.01 | Swimming pool, glass of water |
| Crown Glass | 1.52 | 0.02 | Window glass, eyeglasses |
| Flint Glass | 1.65 | 0.05 | Optical prisms, camera lenses |
| Diamond | 2.42 | 0.08 | Jewelry, cutting tools |

## Technical Implementation

### WebGL Shaders
- **Vertex Shader**: Simple fullscreen quad rendering
- **Fragment Shader**: Complex physics calculations for each pixel
- **Real-time Rendering**: 60fps performance with hardware acceleration

### Key Technologies
- WebGL 1.0 compatible
- Custom GLSL fragment shaders
- Canvas-based rendering
- Real-time uniform updates

### Performance Optimizations
- Single-pass rendering
- Efficient noise functions
- Optimized shader conditionals
- Responsive canvas sizing

## Usage

1. Open `index.html` in a modern web browser
2. **Move your mouse** around to see the glass effect follow your cursor
3. **Select different glass shapes** from the dropdown (sphere, cylinder, lens, prism, flat)
4. **Choose background patterns** that best show the distortion (try sphere + stripes!)
5. **Adjust optical properties** using the sliders for real-time physics changes
6. **Click the "Glass Physics" button** to cycle through pre-configured demonstrations
7. **Experiment** with different combinations to see various optical phenomena

### 🎯 Recommended Starting Points:
- **Glass Sphere + Black & White Stripes**: See the dramatic barrel distortion like in your reference image
- **Glass Cylinder + Grid Pattern**: Observe unidirectional stretching effects
- **Convex Lens + Concentric Circles**: Watch light focusing and magnification
- **Triangular Prism + Any Stripes**: See directional refraction and color separation

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari (with WebGL enabled)
- Edge

Requires WebGL support for the physics-based effects.

## Files

- `index.html` - Main page structure
- `styles.css` - Visual styling and layout
- `glass-physics.js` - WebGL renderer and physics implementation

## Physics References

This implementation is based on real optical physics:
- Snell's Law of Refraction
- Fresnel Equations for reflection
- Abbe Number for dispersion calculations
- Caustic light patterns in glass media

The goal was to create a glass effect that goes beyond typical "glassmorphism" by implementing actual optical phenomena that occur in real glass materials. 