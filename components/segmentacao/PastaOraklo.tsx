// Pasta neon com o nome em retícula (halftone), no clima da referência de portfólio.
// Feita em CSS para combinar com a marca e não depender de imagem de terceiros.

export default function PastaOraklo({ titulo = "oraklo", etiqueta = "ORK/26" }: { titulo?: string; etiqueta?: string }) {
  return (
    <div className="pasta group relative mx-auto aspect-[1.32] w-full max-w-[440px] [perspective:1200px]">
      <div className="pasta-corpo relative size-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] [transform-style:preserve-3d] group-hover:[transform:rotateX(8deg)_rotateY(-10deg)_translateY(-6px)]">
        {/* fundo da pasta + aba */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 top-[7%] rounded-[14px] rounded-tr-none bg-gradient-to-br from-[#f3ffd8] via-[#d6ff7a] to-[#9fd52a] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]" />
        <div aria-hidden className="absolute right-0 top-0 flex h-[12%] w-[34%] items-center justify-end rounded-t-[14px] bg-gradient-to-r from-[#bfe854] to-[#8fc21f] pr-4">
          <span className="font-serif text-base font-semibold md:text-lg tracking-wide text-white drop-shadow-sm">{etiqueta}</span>
        </div>

        {/* frente da pasta */}
        <div className="absolute inset-x-0 bottom-0 top-[16%] overflow-hidden rounded-[14px] bg-gradient-to-br from-[#fbfff2] via-[#d9ff8a] to-[#6f9a16] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [container-type:inline-size]">
          <span aria-hidden className="absolute -right-[10%] -top-[30%] size-[70%] rounded-full bg-[#0b0b0c]/25 blur-3xl" />
          {/* nome em retícula */}
          <span
            aria-hidden
            className="absolute left-[14%] right-[2%] top-[22%] select-none font-serif text-[30cqw] italic leading-none tracking-[-0.04em] text-transparent"
            style={{
              backgroundImage: "radial-gradient(circle, #2f4a08 42%, transparent 46%)",
              backgroundSize: "0.9cqw 0.9cqw",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              maskImage: "linear-gradient(100deg, rgba(0,0,0,0.25) 0%, #000 45%, #000 100%)",
              WebkitMaskImage: "linear-gradient(100deg, rgba(0,0,0,0.25) 0%, #000 45%, #000 100%)",
            }}
          >
            {titulo}
          </span>
          {/* lombada vertical */}
          <span aria-hidden className="absolute left-[5%] top-[10%] h-[34%] w-[1.2%] rounded-full bg-[#0b0b0c]/70" />
          <span className="absolute left-[8%] top-[10%] font-mono text-[2.3cqw] uppercase tracking-[0.25em] text-[#0b0b0c]/60 [writing-mode:vertical-rl]">prospecção b2b</span>
          <div className="absolute bottom-[8%] left-[6%]">
            <p className="font-serif text-[5.2cqw] font-semibold leading-[1.05] text-[#0b0b0c]">
              Seu cliente
              <br />
              ideal
            </p>
          </div>
          <p className="absolute right-[6%] top-[9%] max-w-[38%] text-right font-mono text-[2.1cqw] leading-relaxed text-[#0b0b0c]/70">
            Nichos, porte e contatos que você quer — a busca aprende com cada escolha.
          </p>
        </div>
      </div>
    </div>
  );
}
