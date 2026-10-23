"use client";

import { cores } from "@/lib/colors";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Shape } from "@/lib/three/shapes";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uMouse;
  uniform float uMouseForce;
  uniform float uMouseRadius;
  attribute vec3 aShape1;
  attribute vec3 aShape2;
  attribute vec3 aShape3;
  attribute vec4 aRand;
  varying float vAlpha;
  varying float vMix;

  void main() {
    // cada partícula chega no seu tempo: transição orgânica, não "em bloco"
    float m = clamp(uMorph + (aRand.x - 0.5) * 0.35, 0.0, 3.0);
    vec3 p = position;
    p = mix(p, aShape1, smoothstep(0.0, 1.0, clamp(m, 0.0, 1.0)));
    p = mix(p, aShape2, smoothstep(0.0, 1.0, clamp(m - 1.0, 0.0, 1.0)));
    p = mix(p, aShape3, smoothstep(0.0, 1.0, clamp(m - 2.0, 0.0, 1.0)));

    // respiração / deriva
    float t = uTime * (0.4 + aRand.y * 0.6);
    p += 0.035 * vec3(sin(t + aRand.z * 6.28), cos(t * 1.3 + aRand.w * 6.28), sin(t * 0.7 + aRand.x * 6.28));

    // o mouse empurra as partículas
    vec3 d = p - uMouse;
    float dist = length(d);
    float push = uMouseForce * smoothstep(uMouseRadius, 0.0, dist);
    p += normalize(d + 1e-4) * push * (0.6 + aRand.y * 0.6);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.55 + aRand.y * 0.9) / -mv.z;
    vAlpha = 0.45 + aRand.w * 0.55 + push * 0.6;
    vMix = clamp(aRand.z + push, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d) * vAlpha * uOpacity;
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix), a);
  }
`;

export type MorphRef = { current: number };

/**
 * Nuvem de partículas na GPU que se transforma entre até 4 formas.
 * `morph` (0..3) diz em qual forma estar; o valor é suavizado aqui dentro.
 * O mouse empurra as partículas (posição projetada no plano z=0 da cena).
 */
export default function ParticleField({
  shapes,
  morph,
  colorA = cores.neon,
  colorB = cores["particula-clara"],
  size = 26,
  opacity = 1,
  additive = true,
  mouseForce = 0.55,
  mouseRadius = 0.9,
  spin = 0.05,
  tilt = 0.25,
  morphFrom,
}: {
  morphFrom?: number;
  shapes: Shape[];
  morph: MorphRef;
  colorA?: string;
  colorB?: string;
  size?: number;
  opacity?: number;
  additive?: boolean;
  mouseForce?: number;
  mouseRadius?: number;
  spin?: number;
  tilt?: number;
}) {
  const points = useRef<THREE.Points>(null);
  const { gl, camera } = useThree();
  const n = shapes[0].length / 3;

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const s = (i: number) => shapes[Math.min(i, shapes.length - 1)];
    g.setAttribute("position", new THREE.BufferAttribute(s(0), 3));
    g.setAttribute("aShape1", new THREE.BufferAttribute(s(1), 3));
    g.setAttribute("aShape2", new THREE.BufferAttribute(s(2), 3));
    g.setAttribute("aShape3", new THREE.BufferAttribute(s(3), 3));
    const rand = new Float32Array(n * 4);
    for (let i = 0; i < rand.length; i++) rand[i] = Math.random();
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    g.computeBoundingSphere();
    return g;
  }, [shapes, n]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: morph.current },
          uSize: { value: size },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uMouse: { value: new THREE.Vector3(99, 99, 99) },
          uMouseForce: { value: mouseForce },
          uMouseRadius: { value: mouseRadius },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) },
          uOpacity: { value: opacity },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [additive],
  );

  // cores e tamanho podem mudar sem recriar o material
  useEffect(() => {
    material.uniforms.uColorA.value.set(colorA);
    material.uniforms.uColorB.value.set(colorB);
    material.uniforms.uSize.value = size;
    material.uniforms.uOpacity.value = opacity;
  }, [material, colorA, colorB, size, opacity]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  // Formas novas chegaram: recomeça a transição a partir de `morphFrom` (ex.: 0 = forma anterior).
  useEffect(() => {
    if (morphFrom !== undefined) material.uniforms.uMorph.value = morphFrom;
  }, [geometry, material, morphFrom]);

  // posição do mouse em coordenadas da tela (-1..1) relativa ao canvas
  const ndc = useRef(new THREE.Vector2(9, 9));
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.current.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const leave = () => ndc.current.set(9, 9);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [gl]);

  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const smoothMouse = useMemo(() => new THREE.Vector3(99, 99, 99), []);

  useFrame(({ clock, pointer }, delta) => {
    const u = material.uniforms;
    u.uTime.value = clock.getElapsedTime();
    u.uMorph.value = THREE.MathUtils.damp(u.uMorph.value, morph.current, 2.2, delta);

    const p = points.current;
    if (!p) return;
    p.rotation.y += spin * delta;
    const px = Math.abs(ndc.current.x) <= 1.2 ? ndc.current.x : 0;
    const py = Math.abs(ndc.current.y) <= 1.2 ? ndc.current.y : 0;
    p.rotation.x = THREE.MathUtils.damp(p.rotation.x, -py * tilt, 3, delta);
    p.rotation.z = THREE.MathUtils.damp(p.rotation.z, px * tilt * 0.3, 3, delta);
    void pointer;

    // mouse -> plano z=0 -> espaço local das partículas
    if (Math.abs(ndc.current.x) <= 1.2 && Math.abs(ndc.current.y) <= 1.2) {
      ray.setFromCamera(ndc.current, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        p.worldToLocal(hit);
        smoothMouse.lerp(hit, Math.min(1, delta * 10));
      }
    } else {
      smoothMouse.lerp(new THREE.Vector3(99, 99, 99), Math.min(1, delta * 2));
    }
    u.uMouse.value.copy(smoothMouse);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
