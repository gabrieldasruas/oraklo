"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const NEON = "#b8ff3c";
const NIGHT = "#0b0b0c";

// Um anel de órbita fino com um "lead" (esfera verde) girando nele.
function Orbit({ radius, tilt, speed, offset }: { radius: number; tilt: [number, number, number]; speed: number; offset: number }) {
  const lead = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    lead.current?.position.set(Math.cos(t) * radius, Math.sin(t) * radius, 0);
  });
  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.008, 12, 160]} />
        <meshBasicMaterial color={NIGHT} transparent opacity={0.35} />
      </mesh>
      <mesh ref={lead}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshStandardMaterial color={NEON} emissive={NEON} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Logo do Prospecta em 3D: cubo preto polido com o ponto neon pulsando.
function Logo({ interactive }: { interactive: boolean }) {
  const group = useRef<THREE.Group>(null);
  const dot = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ pointer, clock }, delta) => {
    const g = group.current;
    if (g) {
      const px = THREE.MathUtils.clamp(pointer.x, -1.5, 1.5);
      const py = THREE.MathUtils.clamp(pointer.y, -1.5, 1.5);
      const tx = interactive ? -py * 0.35 : 0;
      const ty = interactive ? px * 0.5 : 0;
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tx - 0.18, 4, delta);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ty + 0.35, 4, delta);
    }
    if (dot.current) {
      dot.current.emissiveIntensity = 1.2 + Math.sin(clock.getElapsedTime() * 2.4) * 0.6;
    }
  });

  return (
    <group ref={group}>
      <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.28} smoothness={6}>
        <meshPhysicalMaterial color={NIGHT} roughness={0.22} metalness={0.1} clearcoat={1} clearcoatRoughness={0.12} />
      </RoundedBox>
      {/* ponto neon na face da frente */}
      <mesh position={[0, 0, 0.76]}>
        <sphereGeometry args={[0.22, 48, 48]} />
        <meshStandardMaterial ref={dot} color={NEON} emissive={NEON} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Prospecta3D({
  className = "",
  interactive = true,
  orbits = true,
  quality = "high",
}: {
  className?: string;
  interactive?: boolean;
  orbits?: boolean;
  quality?: "high" | "low";
}) {
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 35 }}
        dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
        gl={{ antialias: true, alpha: true }}
        frameloop={still ? "demand" : "always"}
        // segue o mouse na página inteira, não só em cima do canvas
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
        style={{ pointerEvents: "none" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        {/* reflexos de estúdio gerados localmente (sem baixar HDR de CDN) */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[0, 3, 2]} scale={[6, 1.5, 1]} />
          <Lightformer form="rect" intensity={1} position={[-4, 0, 1]} rotation-y={Math.PI / 2} scale={[4, 4, 1]} />
          <Lightformer form="ring" color={NEON} intensity={0.6} position={[4, 1, 2]} scale={2} />
        </Environment>
        <Float speed={still ? 0 : 1.6} rotationIntensity={0.25} floatIntensity={0.6}>
          <Logo interactive={interactive && !still} />
          {orbits && (
            <>
              <Orbit radius={1.55} tilt={[1.2, 0.2, 0]} speed={0.6} offset={0} />
              <Orbit radius={1.8} tilt={[0.3, 1.1, 0.4]} speed={-0.45} offset={2} />
              <Orbit radius={2.05} tilt={[-0.8, -0.5, 0.9]} speed={0.35} offset={4} />
            </>
          )}
        </Float>
        <ContactShadows position={[0, -1.75, 0]} opacity={0.28} scale={6} blur={2.6} far={3} />
      </Canvas>
    </div>
  );
}
