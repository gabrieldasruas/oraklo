"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { nicheShape } from "@/lib/three/nicheShapes";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Stage from "../Stage";
import ParticleField from "../ParticleField";
import { galaxy, torus } from "@/lib/three/shapes";

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

const N_NICHE = 6000;

/**
 * Modelo 3D do segmento em destaque (caminhão, armazém, fábrica, trigo, capacete…).
 * Ao trocar de nicho, as partículas saem do modelo anterior e remontam o novo.
 */
export function NicheShape({ icon }: { icon: string }) {
  const [pair, setPair] = useState(() => {
    const s = nicheShape(icon, N_NICHE);
    return { shapes: [s, s], from: 1 };
  });
  const last = useRef(icon);
  const morph = useRef(1);

  useEffect(() => {
    if (icon === last.current) return;
    setPair({ shapes: [nicheShape(last.current, N_NICHE), nicheShape(icon, N_NICHE)], from: 0 });
    last.current = icon;
    morph.current = 1;
  }, [icon]);

  return (
    <Stage className="h-60" camera={{ position: [0, 0.4, 5.6], fov: 40 }} dpr={[1, 1.5]}>
      <group rotation={[0.25, -0.5, 0]}>
        <ParticleField shapes={pair.shapes} morph={morph} morphFrom={pair.from} size={19} mouseForce={0.55} spin={0.3} tilt={0.15} />
      </group>
    </Stage>
  );
}
