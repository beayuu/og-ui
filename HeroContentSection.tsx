import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const heroContent = {
  eyebrow: "adopt a",
  title: "Reef",
  description:
    "Coral reefs cover less than 1% of the ocean floor, yet they support over 25% of all marine life. Join our mission to protect and restore these vital ecosystems — sponsor a coral fragment, fund a reef restoration project, and help ensure future generations inherit a living, thriving ocean.",
  cta: "Adopt Now",
};

export const HeroContentSection = (): JSX.Element => {
  const [, setLocation] = useLocation();

  return (
    <section className="relative z-10 flex w-full justify-center px-4 py-10 sm:px-6 md:py-14 lg:py-16">
      <div className="flex w-full max-w-[610px] flex-col items-center justify-center gap-5 text-center">
        <header className="relative flex w-full max-w-[610px] flex-col items-center">
          <div className="relative w-full">
            <h1 className="m-0 flex justify-center [font-family:'Inter',Helvetica] font-bold leading-none tracking-[-0.03em] text-white text-[clamp(88px,22vw,175px)] sm:text-[clamp(120px,23vw,220px)] lg:text-[285px]">
              {heroContent.title}
            </h1>
            <p className="pointer-events-none absolute left-1/2 top-[2px] m-0 -translate-x-1/2 [font-family:'Inter',Helvetica] font-bold leading-none tracking-[-2.04px] text-white text-[clamp(26px,5.2vw,44px)] sm:text-[52px] lg:text-[68px]">
              {heroContent.eyebrow}
            </p>
          </div>
        </header>
        <p className="w-full max-w-[610px] [font-family:'Poppins',Helvetica] text-center text-[11px] font-normal leading-[1.35] tracking-[-0.42px] text-white sm:text-sm">
          {heroContent.description}
        </p>
        <Button
          type="button"
          onClick={() => setLocation("/adopt")}
          data-testid="button-adopt-now"
          className="h-auto min-h-[50px] rounded-[5px] border-2 border-transparent bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] px-6 py-2 [font-family:'DM_Sans',Helvetica] text-[24px] font-bold leading-none text-white shadow-[0px_5px_20px_-2px_#00000040] transition-colors duration-200 hover:border-[#052698] hover:bg-none hover:bg-white hover:text-[#052698] sm:text-[28px] lg:w-[206px] lg:text-[32px]"
        >
          {heroContent.cta}
        </Button>
      </div>
    </section>
  );
};
