"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Stage from "../Stage";
import ParticleField from "../ParticleField";
import { block, galaxy, helix, sphere, torus } from "@/lib/three/shapes";

export const TONE_COLORS: Record<string, [string, string]> = {
  lime: ["#7fbf1a", "#b8ff3c"],
  sun: ["#ff8f5a", "#ffd166"],
  mint: ["#2bb3a3", "#7ff0c9"],
  lilac: ["#7a6cff", "#c9b8ff"],
  coral: ["#ff5f86", "#ffb08f"],
  night: ["#0b0b0c", "#4b5563"],
};

// Gira junto com o anel de cartões (ângulo em graus vindo do SegmentExplorer).
function Synced({ rotation, children }: { rotation: React.RefObject<number>; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.rotation.y = THREE.MathUtils.degToRad(-(rotation.current ?? 0));
  });
  return <group ref={g}>{children}</group>;
}

/** Vórtice de partículas atrás do anel de nichos, na cor da área ativa. */
export function RingVortex({ rotation, tone }: { rotation: React.RefObject<number>; tone: string }) {
  const shapes = useMemo(() => [torus(9000, 3.1, 0.9), galaxy(9000, 5, 21)], []);
  const morph = useRef(0);
  const [a, b] = TONE_COLORS[tone] ?? TONE_COLORS.lime;
  return (
    <Stage className="size-full" camera={{ position: [0, 2.2, 7.5], fov: 45 }} dpr={[1, 1.5]}>
      <group position={[0, -1.4, 0]} rotation-x={0.12}>
        <Synced rotation={rotation}>
          <ParticleField shapes={shapes} morph={morph} colorA={a} colorB={b} additive={false} size={22} opacity={0.75} mouseForce={0.5} spin={0} tilt={0.05} />
        </Synced>
      </group>
    </Stage>
  );
}

/** Forma 3D do nicho em destaque: cada nicho tem a sua (esfera, hélice, galáxia, bloco). */
export function NicheShape({ index, companies }: { index: number; companies: number }) {
  const shapes = useMemo(() => [sphere(5000, 1.25), helix(5000), galaxy(5000, 3, 9), block(5000, 2, 1.6, 1.6)], []);
  const morph = useRef(index % 4);
  useEffect(() => {
    morph.current = index % 4;
  }, [index]);
  // nichos com mais empresas = partículas maiores
  const size = 16 + Math.min(14, Math.log10(companies + 1) * 3);
  return (
    <Stage className="h-56" camera={{ position: [0, 0, 5.4], fov: 40 }} dpr={[1, 1.5]}>
      <ParticleField shapes={shapes} morph={morph} size={size} mouseForce={0.6} spin={0.25} />
    </Stage>
  );
}
