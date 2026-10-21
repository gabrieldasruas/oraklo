// Animações de entrada em CSS puro (classes em globals.css):
// rodam assim que o HTML chega, sem esperar o JavaScript carregar.

// Card que sobe e aparece. `index` cria o efeito em cascata.
export function Reveal({
  children,
  index = 0,
  className = "",
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <div className={`reveal ${className}`} style={{ animationDelay: `${0.08 + index * 0.06}s` }}>
      {children}
    </div>
  );
}

// Título revelado com máscara, de baixo para cima (como o manifesto do Buttermax).
export function MaskText({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
      <span className="mask-up inline-block" style={{ animationDelay: `${delay}s` }}>
        {children}
      </span>
    </span>
  );
}
