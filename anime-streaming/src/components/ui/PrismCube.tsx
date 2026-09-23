"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function PrismCube() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Cleanup any existing renderer
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // === Create the Prism-Cube Geometry ===
    // Main cube – slightly stretched to look like a prism
    const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8, 4, 4, 4);

    // Glass material with red tint
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xff1a1a),
      metalness: 0.05,
      roughness: 0.02,
      transmission: 0.92,
      thickness: 1.5,
      ior: 2.33,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
    });

    const cube = new THREE.Mesh(geometry, glassMaterial);
    scene.add(cube);

    // Inner glowing cube
    const innerGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const innerMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xff3333),
      emissive: new THREE.Color(0xcc0000),
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const innerCube = new THREE.Mesh(innerGeometry, innerMaterial);
    scene.add(innerCube);

    // Wireframe overlay
    const wireGeometry = new THREE.BoxGeometry(1.82, 1.82, 1.82);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xff6666),
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const wireframe = new THREE.Mesh(wireGeometry, wireMaterial);
    scene.add(wireframe);

    // Edge glow lines
    const edgesGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.81, 1.81, 1.81));
    const edgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xff4444),
      transparent: true,
      opacity: 0.35,
      linewidth: 1,
    });
    const edges = new THREE.LineSegments(edgesGeom, edgeMat);
    scene.add(edges);

    // === Light Rays (dispersion beams) ===
    // Create light beam geometry (elongated cones as light rays)
    const createLightRay = (
      color: number,
      posX: number,
      posY: number,
      rotZ: number,
      scaleX: number,
      opacity: number
    ) => {
      const rayGeom = new THREE.ConeGeometry(0.08, 6, 8);
      const rayMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
      });
      const ray = new THREE.Mesh(rayGeom, rayMat);
      ray.position.set(posX, posY, 0);
      ray.rotation.z = rotZ;
      ray.scale.set(scaleX, 1, scaleX);
      return ray;
    };

    const raysGroup = new THREE.Group();

    // Incoming beam (bright white-red)
    raysGroup.add(createLightRay(0xffcccc, -3.5, 0, Math.PI / 2, 0.7, 0.15));
    raysGroup.add(createLightRay(0xff6666, -3.5, 0, Math.PI / 2, 0.4, 0.2));

    // Dispersed rays (different red tones spreading out)
    raysGroup.add(createLightRay(0xff0000, 3.5, 0.6, -Math.PI / 2 + 0.12, 0.5, 0.12));
    raysGroup.add(createLightRay(0xff3300, 3.5, 0.2, -Math.PI / 2 + 0.04, 0.5, 0.15));
    raysGroup.add(createLightRay(0xff6600, 3.5, -0.2, -Math.PI / 2 - 0.04, 0.4, 0.12));
    raysGroup.add(createLightRay(0xff9900, 3.5, -0.6, -Math.PI / 2 - 0.12, 0.4, 0.1));
    raysGroup.add(createLightRay(0xffcc00, 3.6, 1.0, -Math.PI / 2 + 0.2, 0.3, 0.08));

    scene.add(raysGroup);

    // === Floating Particles ===
    const particlesCount = 150;
    const particlePositions = new Float32Array(particlesCount * 3);
    const particleColors = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 10;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 6;

      // Shades of red
      const redShade = 0.7 + Math.random() * 0.3;
      particleColors[i * 3] = redShade;
      particleColors[i * 3 + 1] = Math.random() * 0.3;
      particleColors[i * 3 + 2] = Math.random() * 0.2;
    }

    const particlesGeom = new THREE.BufferGeometry();
    particlesGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particlesGeom.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.035,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particlesGeom, particlesMat);
    scene.add(particles);

    // === Lighting Setup ===
    // Main red point light
    const mainLight = new THREE.PointLight(0xff2222, 3, 12);
    mainLight.position.set(2, 2, 3);
    scene.add(mainLight);

    // Subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x331111, 0.8);
    scene.add(ambientLight);

    // Rim light (warm red from behind)
    const rimLight = new THREE.PointLight(0xff4400, 2, 10);
    rimLight.position.set(-3, -1, -2);
    scene.add(rimLight);

    // Top accent light
    const topLight = new THREE.PointLight(0xff6666, 1.5, 8);
    topLight.position.set(0, 3, 1);
    scene.add(topLight);

    // Cool accent for contrast
    const coolLight = new THREE.PointLight(0x220033, 1, 8);
    coolLight.position.set(-2, -2, 3);
    scene.add(coolLight);

    // Directional for shadows / depth
    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.5);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // === Mouse interaction ===
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMouseMove);

    // === Animation Loop ===
    const timer = new THREE.Timer();

    const animate = () => {
      timer.update();
      const elapsed = timer.getElapsed();

      // Slow rotation
      cube.rotation.x = elapsed * 0.15 + mouseY * 0.3;
      cube.rotation.y = elapsed * 0.2 + mouseX * 0.3;
      cube.rotation.z = elapsed * 0.08;

      innerCube.rotation.x = -elapsed * 0.25;
      innerCube.rotation.y = -elapsed * 0.3;

      wireframe.rotation.copy(cube.rotation);
      edges.rotation.copy(cube.rotation);

      // Light rays follow rotation slightly
      raysGroup.rotation.z = Math.sin(elapsed * 0.3) * 0.05;
      raysGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.03;

      // Pulsing glow
      const pulse = Math.sin(elapsed * 2) * 0.15 + 0.85;
      innerMaterial.emissiveIntensity = 0.6 + pulse * 0.4;
      glassMaterial.opacity = 0.75 + pulse * 0.15;

      // Subtle particle drift
      particles.rotation.y = elapsed * 0.02;
      particles.rotation.x = Math.sin(elapsed * 0.1) * 0.05;

      // Light animation
      mainLight.intensity = 2.5 + Math.sin(elapsed * 1.5) * 0.5;
      rimLight.position.x = -3 + Math.sin(elapsed * 0.5) * 0.5;
      topLight.position.y = 3 + Math.cos(elapsed * 0.7) * 0.3;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // === Resize handler ===
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      id="prism-cube-container"
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
      }}
    />
  );
}
