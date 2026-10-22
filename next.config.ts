import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Portfólio: arquivos importados (PDF/CSV/imagem) de até 3 MB + folga do multipart.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
