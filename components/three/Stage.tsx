"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Desloca o desenho da cena para o lado (fração da largura) sem mover o 3D:
// a rotação continua centrada no objeto. Só no desktop, onde o texto ocupa a esquerda.
function ViewShift({ shift }: { shift: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const s = size.width > 900 ? shift : 0;
    if (s) cam.setViewOffset(size.width, size.height, -size.width * s, 0, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [camera, size, shift]);
  return null;
}

/**
 * Palco padrão das cenas 3D do app:
 * - pausa o render quando sai da tela (economiza GPU/bateria)
 * - os eventos do 3D (hover, clique, arrastar) vêm do próprio palco, inclusive por cima do texto
 * - `overlay` é HTML desenhado por cima do canvas
 */
export default function Stage({
  children,
  overlay,
  className = "",
  camera = { position: [0, 0, 6.5] as [number, number, number], fov: 40 },
  dpr = [1, 1.75] as [number, number],
  shift = 0,
}: {
  shift?: number;
  children: React.ReactNode;
  overlay?: React.ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov: number };
  dpr?: [number, number];
}) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className={`relative ${className}`}>
      <Canvas
        className="!absolute inset-0"
        camera={camera}
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={!visible ? "never" : still ? "demand" : "always"}
        eventSource={box as React.RefObject<HTMLElement>}
        eventPrefix="client"
      >
        {shift !== 0 && <ViewShift shift={shift} />}
        {children}
      </Canvas>
      {overlay}
    </div>
  );
}
