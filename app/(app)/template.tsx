// Recriado a cada navegação: faz a página nova entrar com fade e subida suave.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
