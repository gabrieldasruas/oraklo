"use client";

import dynamic from "next/dynamic";

// Fallback estático (o logo plano) enquanto o Three.js carrega.
function Placeholder() {
  return (
    <div className="flex size-full items-center justify-center" aria-hidden>
      <span className="flex size-1/3 max-h-24 max-w-24 items-center justify-center rounded-[22%] bg-night">
        <span className="size-1/4 rounded-full bg-neon" />
      </span>
    </div>
  );
}

const Prospecta3D = dynamic(() => import("./Prospecta3D"), { ssr: false, loading: Placeholder });

export default Prospecta3D;
