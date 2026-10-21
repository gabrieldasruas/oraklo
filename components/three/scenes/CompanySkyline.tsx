"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import Stage from "../Stage";
import ParticleField from "../ParticleField";
import { wave } from "@/lib/three/shapes";
import { formatMoney, SIZE_LABEL } from "@/lib/format";
import { Micro } from "@/components/app/ui";

export type CompanyBar = { cnpj: string; name: string; shareCapital: number | null; size: string; place: string };

const COLOR: Record<string, string> = { ME: "#b8ff3c", EPP: "#ffb547", DEMAIS: "#8fa8ff" };
const GAP = 0.62;
const FLOOR = -0.9;

function Building({
  c,
  x,
  z,
  height,
  delay,
  mouse,
  dim,
}: {
  c: CompanyBar;
  x: number;
  z: number;
  height: number;
  delay: number;
  mouse: React.RefObject<THREE.Vector3>;
  dim: boolean;
}) {
  const router = useRouter();
  const group = useRef<THREE.Group>(null);
  const cap = useRef<THREE.MeshStandardMaterial>(null);
  const [hover, setHover] = useState(false);
  const born = useRef<number | null>(null);
  const color = COLOR[c.size] ?? "#d8d8de";

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    if (born.current === null) born.current = t;
    // cresce do chão em cascata
    const grow = THREE.MathUtils.clamp((t - born.current - delay) / 0.9, 0, 1);
    const ease = 1 - Math.pow(1 - grow, 3);
    // onda de proximidade do mouse
    const d = mouse.current ? Math.hypot(mouse.current.x - x, mouse.current.z - z) : 99;
    const lift = Math.max(0, 1 - d / 1.4) * 0.55 + (hover ? 0.35 : 0);
    const targetY = THREE.MathUtils.damp(g.position.y, lift, 6, dt);
    g.position.y = targetY;
    g.scale.y = Math.max(0.001, ease);
    if (cap.current) cap.current.emissiveIntensity = THREE.MathUtils.damp(cap.current.emissiveIntensity, hover ? 1.6 : dim ? 0.1 : 0.6, 8, dt);
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      <group
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
          router.push(`/empresas/${c.cnpj}`);
        }}
      >
        <RoundedBox args={[0.46, height, 0.46]} radius={0.05} smoothness={3} position={[0, height / 2, 0]}>
          <meshPhysicalMaterial
            color={hover ? "#4a4f63" : "#2b2e3a"}
            emissive={color}
            emissiveIntensity={hover ? 0.22 : 0.05}
            roughness={0.35}
            metalness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.2}
            transparent
            opacity={dim ? 0.25 : 1}
          />
        </RoundedBox>
        {/* topo aceso na cor do porte */}
        <mesh position={[0, height + 0.012, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshStandardMaterial ref={cap} color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
      </group>
      {hover && (
        <Html position={[0, height + 0.5, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="w-60 rounded-2xl border border-white/15 bg-night/90 p-4 text-white shadow-2xl backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color }}>
              {SIZE_LABEL[c.size] ?? "Porte não informado"}
            </p>
            <p className="mt-1 text-sm font-medium leading-tight">{c.name}</p>
            <p className="mt-1 text-xs text-white/55">{c.place || "—"}</p>
            <p className="mt-2 text-2xl font-light tracking-[-0.04em]">{formatMoney(c.shareCapital)}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">Clique para abrir</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Projeta o mouse no chão (y=0) para a "onda" que levanta os prédios próximos.
function GroundMouse({ target }: { target: React.RefObject<THREE.Vector3> }) {
  const { camera, gl } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  // chão da cidade fica em y = FLOOR
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR), []);
  const ndc = useRef(new THREE.Vector2(9, 9));
  const hit = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect();
      ndc.current.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [gl]);
  useFrame(() => {
    if (Math.abs(ndc.current.x) > 1 || Math.abs(ndc.current.y) > 1) {
      target.current?.set(99, 0, 99);
      return;
    }
    ray.setFromCamera(ndc.current, camera);
    if (ray.ray.intersectPlane(plane, hit)) target.current?.lerp(hit, 0.2);
  });
  return null;
}

export default function CompanySkyline({ companies, total }: { companies: CompanyBar[]; total: number }) {
  const [focus, setFocus] = useState<string | null>(null);
  const mouse = useRef(new THREE.Vector3(99, 0, 99));
  const floor = useMemo(() => [wave(5000, 9, 7, 11)], []);
  const morph = useRef(0);

  const layout = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(companies.length * 1.6)) || 1;
    const rows = Math.ceil(companies.length / cols) || 1;
    const max = Math.log10(Math.max(...companies.map((c) => c.shareCapital ?? 0), 10) + 1);
    return companies.map((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const h = 0.25 + (Math.log10((c.shareCapital ?? 0) + 1) / max) * 2.6;
      return { c, x: (col - (cols - 1) / 2) * GAP, z: (row - (rows - 1) / 2) * GAP, h, delay: (col + row) * 0.045 };
    });
  }, [companies]);

  const sizes = ["ME", "EPP", "DEMAIS"];

  return (
    <section aria-label="Skyline 3D das empresas encontradas" className="relative overflow-hidden rounded-[28px] bg-night text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 60% at 60% 30%, rgba(143,168,255,0.16), transparent 70%), radial-gradient(45% 50% at 100% 100%, rgba(184,255,60,0.12), transparent 70%)" }}
      />
      <Stage
        className="h-[440px] cursor-grab active:cursor-grabbing md:h-[520px]"
        camera={{ position: [5.2, 4.6, 6.4], fov: 38 }}
        shift={0.18}
        overlay={
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-9">
            <div>
              <Micro className="!opacity-60">Skyline de empresas · 3D</Micro>
              <p className="mt-4 text-5xl font-light leading-none tracking-[-0.06em] md:text-7xl">
                {total.toLocaleString("pt-BR")}
              </p>
              <p className="mt-2 max-w-xs text-sm text-white/55">
                {companies.length
                  ? `Cada prédio é uma das ${companies.length} empresas desta página. Altura = capital social. Passe o mouse e clique para abrir.`
                  : "Nenhuma empresa com esses filtros."}
              </p>
            </div>
            <ul className="pointer-events-auto flex flex-wrap gap-2">
              {sizes.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onPointerEnter={() => setFocus(s)}
                    onPointerLeave={() => setFocus(null)}
                    onFocus={() => setFocus(s)}
                    onBlur={() => setFocus(null)}
                    className="flex min-h-10 cursor-default items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs backdrop-blur hover:bg-white/10"
                  >
                    <span className="size-2 rounded-full" style={{ background: COLOR[s] }} />
                    {SIZE_LABEL[s]}
                    <span className="font-mono text-white/50">{companies.filter((c) => c.size === s).length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <ambientLight intensity={0.7} />
        <hemisphereLight args={["#c9d4ff", "#0b0b0c", 1.2]} />
        <directionalLight position={[4, 8, 5]} intensity={2.2} />
        <directionalLight position={[-6, 3, 4]} intensity={0.8} color="#b8ff3c" />
        <pointLight position={[-4, 3, -2]} intensity={6} color="#8fa8ff" />
        <GroundMouse target={mouse} />
        <group position={[0, FLOOR, 0]}>
          <group position={[0, -0.1, 0]} scale={[1, 0.35, 1]}>
            <ParticleField shapes={floor} morph={morph} size={14} opacity={0.5} colorA="#8fa8ff" colorB="#b8ff3c" mouseForce={0} spin={0} tilt={0} />
          </group>
          {layout.map((b) => (
            <Building key={b.c.cnpj} c={b.c} x={b.x} z={b.z} height={b.h} delay={b.delay} mouse={mouse} dim={!!focus && focus !== b.c.size} />
          ))}
        </group>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.4} rotateSpeed={0.5} minPolarAngle={0.6} maxPolarAngle={1.25} />
      </Stage>
    </section>
  );
}
