import { Micro } from "@/components/app/ui";
import { MaskText } from "@/components/motion/Reveal";

export default function PageHeader({
  index,
  title,
  description,
  action,
}: {
  index: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 px-1 pb-6 pt-4 md:pb-8">
      <div>
        <Micro>
          {index} / {title}
        </Micro>
        <h1 className="mt-3 text-5xl font-medium leading-[0.95] tracking-[-0.045em] md:text-7xl">
          <MaskText>{title}</MaskText>
          <span className="ml-1 inline-block size-3 rounded-full bg-neon ring-1 ring-night/30 md:size-4" />
        </h1>
        {description && <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-60">{description}</p>}
      </div>
      {action}
    </header>
  );
}
