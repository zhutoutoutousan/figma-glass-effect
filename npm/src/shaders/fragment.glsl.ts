export const fragmentShaderSource = `
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
        // Black and white stripes
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
        // Texture pattern - sample from background texture
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