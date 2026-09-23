"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Fullscreen fragment-shader "light beam" that flows from the left edge and
 * converges to a hot apex on the right — the Anifire take on the
 * "Always / Onwards" hero. Pure WebGL, composited additively over the dark
 * CSS backdrop so it reads as glowing fire rather than a flat texture.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;

  float hash(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0,0.0)), c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.02; a *= 0.5; }
    return v;
  }

  void main(){
    vec2 uv = vUv;
    float apex = 0.80;
    float yc = uv.y - 0.5;

    // Cone half-height shrinks from the left edge to a point at the apex.
    float h = mix(0.42, 0.0, smoothstep(0.04, apex, uv.x));
    h = max(h, 0.0);

    float t = uTime * 0.2;
    float n = fbm(vec2(uv.x * 3.5 - t * 2.2, uv.y * 7.0 + sin(t * 0.7) * 0.4));
    float hh = h * (0.55 + 0.7 * n);

    float d = abs(yc);
    float core = smoothstep(hh, 0.0, d);
    core *= smoothstep(apex + 0.05, apex - 0.02, uv.x);  // fade past the apex
    core *= smoothstep(0.02, 0.12, uv.x);                 // ease in from far left

    float tip = smoothstep(apex - 0.30, apex, uv.x);

    // Palette: Deep Blood -> AniFire Crimson -> warm gold-white core.
    vec3 blood   = vec3(0.545, 0.051, 0.090);
    vec3 crimson = vec3(0.902, 0.133, 0.200);
    vec3 hot     = vec3(1.000, 0.820, 0.500);

    vec3 col = mix(blood, crimson, core);
    col = mix(col, hot, core * core * (0.28 + 0.85 * tip));

    float intensity = pow(core, 1.4);
    vec3 finalCol = col * intensity * 1.0;

    // Thin warm guide line through the middle, stopping at the apex.
    float line = smoothstep(0.004, 0.0, abs(yc))
               * smoothstep(apex + 0.02, apex, uv.x)
               * smoothstep(0.05, 0.18, uv.x);
    finalCol += vec3(1.0, 0.92, 0.78) * line;

    // Hot glowing dot at the convergence point (a hint of gold).
    float apd = distance(uv, vec2(apex, 0.5));
    finalCol += vec3(1.0, 0.78, 0.42) * smoothstep(0.045, 0.0, apd) * 1.3;

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

export default function HeroBeam({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const start = performance.now();
    const render = () => {
      uniforms.uTime.value = reduceMotion ? 9 : (performance.now() - start) / 1000;
      renderer.render(scene, camera);
    };
    const loop = () => {
      render();
      raf = requestAnimationFrame(loop);
    };
    if (reduceMotion) render();
    else loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
