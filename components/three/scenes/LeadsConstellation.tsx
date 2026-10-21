"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Stage from "../Stage";
import ParticleField from "../ParticleField";
import { galaxy, rng } from "@/lib/three/shapes";
import { Micro } from "@/components/app/ui";

export type LeadNode = { id: string; name: string; company: string; status: string; score: number };

const STATUS = [
  { key: "Novo", color: "#d8d8de" },
  { key: "Em sequência", color: "#38bdf8" },
  { key: "Respondeu", color: "#fbbf24" },
  { key: "Reunião marcada", color: "#b8ff3c" },
  { key: "Sem interesse", color: "#fb7185" },
];
const MAX = 400;

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// Centro de cada grupo de status num anel inclinado.
const hubs = STATUS.map((s, i) => {
  const a = (i / STATUS.length) * Math.PI * 2 - Math.PI / 2;
  return { ...s, pos: new THREE.Vector3(Math.cos(a) * 2.3, Math.sin(i * 1.7) * 0.45, Math.sin(a) * 2.3) };
});

function Node({
  lead,
  pos,
  color,
  dim,
  onPick,
}: {
  lead: LeadNode;
  pos: THREE.Vector3;
  color: string;
  dim: boolean;
  onPick: (id: string) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const base = 0.045 + (lead.score / 100) * 0.07;
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const s = THREE.MathUtils.damp(m.scale.x, hover ? 2.2 : 1, 8, dt);
    m.scale.setScalar(s);
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.opacity = THREE.MathUtils.damp(mat.opacity, dim ? 0.12 : 1, 6, dt);
  });
  return (
    <mesh
      ref={ref}
      position={pos}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPick(lead.id);
      }}
    >
      <sphereGeometry args={[base, 20, 20]} />
      <meshBasicMaterial color={color} transparent toneMapped={false} />
      {hover && (
        <Html distanceFactor={7} position={[0, base + 0.12, 0]} center style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-2xl border border-white/15 bg-night/90 px-4 py-2.5 text-white shadow-xl backdrop-blur">
            <p className="text-sm font-medium">{lead.name}</p>
            <p className="text-xs text-white/60">
              {lead.company} · score {lead.score}
            </p>
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Hub({ pos, color, label, count, dim }: { pos: THREE.Vector3; color: string; label: string; count: number; dim: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = clock.getElapsedTime();
    ring.current.rotation.z = t * 0.6;
    ring.current.scale.setScalar(1 + Math.sin(t * 2 + pos.x) * 0.08);
  });
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={dim ? 0.15 : 1} toneMapped={false} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[0.22, 0.006, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={dim ? 0.1 : 0.6} />
      </mesh>
      <Html distanceFactor={8} position={[0, -0.36, 0]} center style={{ pointerEvents: "none" }}>
        <p className={`whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] transition-opacity ${dim ? "opacity-20" : "opacity-80"}`} style={{ color }}>
          {label} · {count}
        </p>
      </Html>
    </group>
  );
}

// No celular desce um pouco a constelação, para não ficar atrás do título.
function Layout({ children }: { children: React.ReactNode }) {
  const w = useThree((s) => s.size.width);
  return <group position={[0, w > 900 ? 0 : -0.5, 0]}>{children}</group>;
}

export default function LeadsConstellation({ leads, onPick }: { leads: LeadNode[]; onPick: (id: string) => void }) {
  const [focus, setFocus] = useState<string | null>(null);
  const dust = useMemo(() => [galaxy(3500, 4)], []);
  const morph = useRef(0);

  const nodes = useMemo(
    () =>
      leads.slice(0, MAX).map((l) => {
        const hub = hubs.find((h) => h.key === l.status) ?? hubs[0];
        const r = rng(hash(l.id));
        const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
        const pos = hub.pos.clone().add(dir.multiplyScalar(0.35 + r() * 0.55));
        return { lead: l, pos, hub };
      }),
    [leads],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  return (
    <section aria-label="Constelação de leads em 3D" className="relative overflow-hidden rounded-[28px] bg-night text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(55% 65% at 65% 45%, rgba(56,189,248,0.14), transparent 70%), radial-gradient(40% 50% at 10% 90%, rgba(184,255,60,0.12), transparent 70%)" }}
      />
      <Stage
        className="h-[460px] cursor-grab active:cursor-grabbing md:h-[540px]"
        camera={{ position: [0, 1.6, 7], fov: 42 }}
        shift={0.16}
        overlay={
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-10">
            <div>
              <Micro className="!opacity-60">Constelação de leads · 3D</Micro>
              <p className="mt-4 text-6xl font-light leading-none tracking-[-0.06em] md:text-8xl">
                {leads.length.toLocaleString("pt-BR")}
              </p>
              <p className="mt-2 max-w-xs text-sm text-white/55">
                {leads.length
                  ? "Cada ponto é um lead, agrupado pelo status. Arraste para girar e clique num ponto para abrir o contato."
                  : "Cadastre leads para povoar a constelação."}
              </p>
            </div>
            <ul className="pointer-events-auto flex flex-wrap gap-2">
              {STATUS.map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onPointerEnter={() => setFocus(s.key)}
                    onPointerLeave={() => setFocus(null)}
                    onFocus={() => setFocus(s.key)}
                    onBlur={() => setFocus(null)}
                    className="flex min-h-10 cursor-default items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs backdrop-blur hover:bg-white/10"
                  >
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    {s.key}
                    <span className="font-mono text-white/50">{counts[s.key] ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <Layout>
          <ParticleField shapes={dust} morph={morph} size={16} opacity={0.35} colorA="#7dd3fc" colorB="#b8ff3c" mouseForce={0.4} spin={0.02} tilt={0.1} />
          {hubs.map((h) => (
            <Hub key={h.key} pos={h.pos} color={h.color} label={h.key} count={counts[h.key] ?? 0} dim={!!focus && focus !== h.key} />
          ))}
          {nodes.map(({ lead, pos, hub }) => (
            <group key={lead.id}>
              <Line points={[hub.pos, pos]} color={hub.color} lineWidth={0.6} transparent opacity={focus && focus !== hub.key ? 0.04 : 0.28} />
              <Node lead={lead} pos={pos} color={hub.color} dim={!!focus && focus !== hub.key} onPick={onPick} />
            </group>
          ))}
        </Layout>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} rotateSpeed={0.5} minPolarAngle={0.9} maxPolarAngle={2.0} />
      </Stage>
    </section>
  );
}
