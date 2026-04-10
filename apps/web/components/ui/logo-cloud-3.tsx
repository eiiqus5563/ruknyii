import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  const safeLogos = logos.filter((logo) => Boolean(logo?.src));
  const minItemsPerTrack = 10;
  const repeatedLogos =
    safeLogos.length > 0
      ? Array.from({ length: Math.ceil(minItemsPerTrack / safeLogos.length) }).flatMap(
          () => safeLogos
        )
      : safeLogos;

  return (
    <div
      {...props}
      dir="ltr"
      className={cn(
        "overflow-hidden py-4",
        className
      )}
    >
      <InfiniteSlider gap={24} duration={32}>
        {repeatedLogos.map((logo, index) => (
          <div
            key={`logo-${logo.alt}-${index}`}
            className="shrink-0 flex h-[110px] w-[132px] flex-col items-center justify-center rounded-2xl p-4"
          >
            <div className="flex h-8 w-24 items-center justify-center">
              <img
                alt={logo.alt}
                className="pointer-events-none h-full w-full select-none object-contain"
                height={logo.height}
                loading="lazy"
                src={logo.src}
                width={logo.width}
              />
            </div>
          </div>
        ))}
      </InfiniteSlider>
    </div>
  );
}