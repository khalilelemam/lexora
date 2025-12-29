/**
 * Photorealistic Glass Shader with Refraction & Chromatic Aberration
 * Uses Three.js for WebGL rendering
 * 
 * Parameters:
 * - lightDirection: vec2 - Direction of light source (normalized)
 * - refractionLevel: float - Intensity of refraction (0.0 - 1.0)
 * - depth: float - Glass thickness/depth effect (0.0 - 1.0)
 * - dispersion: float - Chromatic aberration strength (0.0 - 1.0)
 * - frost: float - Blur/frost intensity (0.0 - 1.0)
 */

class GlassEffect {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        this.options = {
            lightDirection: options.lightDirection || { x: 0.5, y: 0.5 },
            refractionLevel: options.refractionLevel ?? 0.3,
            depth: options.depth ?? 0.5,
            dispersion: options.dispersion ?? 0.15,
            frost: options.frost ?? 0.1,
            ...options
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.material = null;
        this.backgroundTexture = null;
        this.animationId = null;

        this.init();
    }

    init() {
        const rect = this.container.getBoundingClientRect();

        // Create scene
        this.scene = new THREE.Scene();

        // Orthographic camera for 2D overlay
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.z = 1;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.domElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            border-radius: inherit;
        `;

        // Make container relative if not already
        const computedStyle = getComputedStyle(this.container);
        if (computedStyle.position === 'static') {
            this.container.style.position = 'relative';
        }

        this.container.appendChild(this.renderer.domElement);

        // Create shader material
        this.createMaterial();

        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(mesh);

        // Capture background
        this.captureBackground();

        // Handle resize
        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);

        // Start render loop
        this.render();
    }

    createMaterial() {
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            precision highp float;
            
            uniform sampler2D uTexture;
            uniform vec2 uResolution;
            uniform vec2 uLightDirection;
            uniform float uRefractionLevel;
            uniform float uDepth;
            uniform float uDispersion;
            uniform float uFrost;
            uniform float uTime;
            
            varying vec2 vUv;
            
            // Pseudo-random function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            // Noise for frost effect
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            // Fresnel effect for edge lighting
            float fresnel(vec2 uv, vec2 lightDir) {
                vec2 center = uv - 0.5;
                float dist = length(center);
                float angle = dot(normalize(center), normalize(lightDir));
                return pow(1.0 - abs(angle), 2.0) * (1.0 - dist);
            }
            
            // Refraction offset based on depth and light
            vec2 getRefraction(vec2 uv, float depth) {
                vec2 center = uv - 0.5;
                float distFromCenter = length(center);
                
                // Simulate glass curvature
                float curvature = 1.0 - pow(distFromCenter * 2.0, 2.0);
                curvature = max(curvature, 0.0);
                
                // Light-based refraction direction
                vec2 refractionDir = normalize(uLightDirection - 0.5) * curvature;
                
                // Add depth influence
                float depthFactor = depth * 0.1;
                
                return refractionDir * uRefractionLevel * 0.1 * (1.0 + depthFactor);
            }
            
            // Chromatic aberration (dispersion)
            vec3 chromaticAberration(vec2 uv, vec2 refraction, float dispersion) {
                float aberrationStrength = dispersion * 0.02;
                
                // Sample RGB at slightly different offsets
                vec2 redOffset = refraction * (1.0 + aberrationStrength);
                vec2 greenOffset = refraction;
                vec2 blueOffset = refraction * (1.0 - aberrationStrength);
                
                float r = texture2D(uTexture, uv + redOffset).r;
                float g = texture2D(uTexture, uv + greenOffset).g;
                float b = texture2D(uTexture, uv + blueOffset).b;
                
                return vec3(r, g, b);
            }
            
            // Blur for frost effect
            vec3 frostBlur(vec2 uv, float frost) {
                if (frost < 0.01) return texture2D(uTexture, uv).rgb;
                
                vec3 color = vec3(0.0);
                float total = 0.0;
                float blurSize = frost * 0.02;
                
                // 9-tap blur with noise offset
                for (float x = -1.0; x <= 1.0; x += 1.0) {
                    for (float y = -1.0; y <= 1.0; y += 1.0) {
                        vec2 offset = vec2(x, y) * blurSize;
                        
                        // Add noise for frosted look
                        float n = noise(uv * 100.0 + vec2(x, y) * 10.0);
                        offset += (n - 0.5) * blurSize * 0.5;
                        
                        color += texture2D(uTexture, uv + offset).rgb;
                        total += 1.0;
                    }
                }
                
                return color / total;
            }
            
            void main() {
                vec2 uv = vUv;
                
                // Calculate refraction
                vec2 refraction = getRefraction(uv, uDepth);
                
                // Apply frost blur first
                vec3 baseColor;
                if (uFrost > 0.01) {
                    baseColor = frostBlur(uv + refraction, uFrost);
                } else {
                    // Apply chromatic aberration
                    baseColor = chromaticAberration(uv, refraction, uDispersion);
                }
                
                // If both frost and dispersion, blend them
                if (uFrost > 0.01 && uDispersion > 0.01) {
                    vec3 dispersedColor = chromaticAberration(uv, refraction, uDispersion * 0.5);
                    baseColor = mix(baseColor, dispersedColor, 0.3);
                }
                
                // Add fresnel highlight
                float fresnelValue = fresnel(uv, uLightDirection);
                vec3 highlight = vec3(1.0) * fresnelValue * 0.15 * uDepth;
                
                // Edge darkening for depth
                float edge = 1.0 - length(uv - 0.5) * 0.3;
                
                // Subtle glass tint
                vec3 glassTint = vec3(0.98, 0.99, 1.0);
                
                // Combine
                vec3 finalColor = baseColor * glassTint * edge + highlight;
                
                // Glass surface reflection (subtle)
                float surfaceReflection = pow(fresnelValue, 3.0) * 0.1;
                finalColor += vec3(surfaceReflection);
                
                // Alpha based on depth and frost
                float alpha = 0.15 + uDepth * 0.2 + uFrost * 0.3;
                alpha = clamp(alpha, 0.0, 0.85);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTexture: { value: null },
                uResolution: { value: new THREE.Vector2() },
                uLightDirection: {
                    value: new THREE.Vector2(
                        this.options.lightDirection.x,
                        this.options.lightDirection.y
                    )
                },
                uRefractionLevel: { value: this.options.refractionLevel },
                uDepth: { value: this.options.depth },
                uDispersion: { value: this.options.dispersion },
                uFrost: { value: this.options.frost },
                uTime: { value: 0 }
            },
            transparent: true,
            depthTest: false
        });
    }

    captureBackground() {
        // Use html2canvas or capture page as texture
        // For now, create a gradient texture as placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#F8FAFC');
        gradient.addColorStop(0.5, '#E2EEF4');
        gradient.addColorStop(1, '#F0E6F0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        this.backgroundTexture = new THREE.CanvasTexture(canvas);
        this.backgroundTexture.needsUpdate = true;
        this.material.uniforms.uTexture.value = this.backgroundTexture;
    }

    // Capture actual page content behind element
    async capturePageBackground() {
        if (typeof html2canvas === 'undefined') {
            console.warn('html2canvas not loaded, using gradient fallback');
            return;
        }

        try {
            // Temporarily hide the canvas
            this.renderer.domElement.style.display = 'none';

            const rect = this.container.getBoundingClientRect();
            const canvas = await html2canvas(document.body, {
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height,
                useCORS: true,
                logging: false
            });

            this.backgroundTexture = new THREE.CanvasTexture(canvas);
            this.backgroundTexture.needsUpdate = true;
            this.material.uniforms.uTexture.value = this.backgroundTexture;

            // Show canvas again
            this.renderer.domElement.style.display = 'block';
        } catch (err) {
            console.warn('Failed to capture background:', err);
            this.renderer.domElement.style.display = 'block';
        }
    }

    onResize() {
        const rect = this.container.getBoundingClientRect();
        this.renderer.setSize(rect.width, rect.height);
        this.material.uniforms.uResolution.value.set(rect.width, rect.height);
    }

    render() {
        this.material.uniforms.uTime.value += 0.016;
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(() => this.render());
    }

    // Update parameters
    setLightDirection(x, y) {
        this.material.uniforms.uLightDirection.value.set(x, y);
    }

    setRefractionLevel(value) {
        this.material.uniforms.uRefractionLevel.value = value;
    }

    setDepth(value) {
        this.material.uniforms.uDepth.value = value;
    }

    setDispersion(value) {
        this.material.uniforms.uDispersion.value = value;
    }

    setFrost(value) {
        this.material.uniforms.uFrost.value = value;
    }

    // Update all parameters at once
    updateParams(params) {
        if (params.lightDirection) {
            this.setLightDirection(params.lightDirection.x, params.lightDirection.y);
        }
        if (params.refractionLevel !== undefined) {
            this.setRefractionLevel(params.refractionLevel);
        }
        if (params.depth !== undefined) {
            this.setDepth(params.depth);
        }
        if (params.dispersion !== undefined) {
            this.setDispersion(params.dispersion);
        }
        if (params.frost !== undefined) {
            this.setFrost(params.frost);
        }
    }

    // Cleanup
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.remove();
            this.renderer.dispose();
        }
        if (this.backgroundTexture) {
            this.backgroundTexture.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlassEffect;
}
