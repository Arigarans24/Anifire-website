"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Animated red "warp tunnel" — a luminous horizontal seam with light streaks
 * radiating from the centre, used behind the final "See it in action" CTA.
 * Rendered additively over black so it glows.
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
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 p = uv - 0.5;
    p.x *= aspect;

    float t = uTime * 0.28;
    float ang = atan(p.y, p.x);
    float rad = length(p);

    // Streaks radiating outward, animated toward the viewer.
    float streaks = fbm(vec2(ang * 4.0, rad * 5.0 - t * 3.0));

    // Bright horizontal seam across the middle.
    float seam = smoothstep(0.16, 0.0, abs(p.y));
    // Glowing "walls" away from the centre line, broken up by streaks.
    float walls = smoothstep(0.05, 0.42, abs(p.y)) * streaks;
    // Soft central bloom.
    float glow = smoothstep(0.95, 0.0, rad);

    float light = seam * 0.85 + walls * 0.95 + glow * 0.2;
    // Pinch the brightness toward the horizontal centre (vanishing point).
    light *= 0.45 + 0.6 * (smoothstep(0.0, 0.35, uv.x) * smoothstep(1.0, 0.6, uv.x));

    // Palette: Deep Blood -> Crimson -> a restrained ember/gold highlight.
    vec3 deep = vec3(0.255, 0.020, 0.035);
    vec3 red  = vec3(0.545, 0.051, 0.090);
    vec3 hot  = vec3(0.902, 0.302, 0.250);

    vec3 col = mix(deep, red, clamp(light, 0.0, 1.0));
    col = mix(col, hot, clamp(light - 0.9, 0.0, 1.0));
    col *= clamp(light, 0.0, 1.1);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function RedTunnel({ className }: { className?: string }) {
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
    scene.add(new THREE.Mesh(geometry, material));

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
      uniforms.uTime.value = reduceMotion ? 6 : (performance.now() - start) / 1000;
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
