import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

const actionCards = [
  {
    image: "/figmaAssets/frame-6.png",
    title: "Ocean Clean Up",
    description:
      "Plastic and debris threaten reef ecosystems every day. Join our volunteer dive and shoreline cleanup events to remove waste at the source — protecting marine habitats before the damage is done.",
    tab: "cleanup",
  },
  {
    image: "/figmaAssets/frame-7.png",
    title: "Coral Replanting",
    description:
      "Our coral gardening program grows resilient coral fragments in underwater nurseries, then transplants them onto degraded reefs. Every fragment you sponsor takes root and becomes a living part of the ocean.",
    tab: "replanting",
  },
  {
    image: "/figmaAssets/frame-8.png",
    title: "Marine Survey",
    description:
      "Data drives conservation. Volunteer as a citizen scientist to monitor reef health, track biodiversity, and document coral bleaching events — your observations directly inform our restoration strategy.",
    tab: "survey",
  },
  {
    image: "/figmaAssets/frame-outreach.png",
    title: "Outreach Program",
    description:
      "Raise awareness in coastal communities and schools about the importance of coral reefs. Lead workshops, distribute materials, and inspire the next generation of ocean stewards.",
    tab: "outreach",
  },
  {
    image: "/figmaAssets/frame-others.png",
    title: "Others",
    description:
      "From fundraising drives to equipment maintenance, there are many ways to contribute behind the scenes. Explore miscellaneous volunteer roles that keep our conservation efforts running strong.",
    tab: "other",
  },
];

export const ActionCardsSection = (): JSX.Element => {
  const [, setLocation] = useLocation();

  return (
    <section className="relative w-full px-9 py-0">
      <div className="mx-auto flex w-full max-w-[1288px] flex-col gap-[43px]">
        <header>
          <h2 className="[font-family:'Inter',Helvetica] text-white text-[64px] font-bold leading-none tracking-[0] sm:text-[84px] lg:text-[117.2px]">
            Take Action
          </h2>
        </header>
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3 xl:gap-[53px]">
          {actionCards.map((card, index) => (
            <Card
              key={`action-card-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => setLocation(`/volunteer?tab=${card.tab}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLocation(`/volunteer?tab=${card.tab}`);
                }
              }}
              data-testid={`card-action-${card.tab}`}
              className="group relative h-[528px] cursor-pointer overflow-hidden rounded-[13px] border-0 bg-transparent shadow-none transition-transform hover-elevate active-elevate-2 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CardContent className="relative flex h-full items-end p-0">
                <img
                  src={card.image}
                  alt={card.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-[320px] rounded-[13px] bg-[linear-gradient(180deg,rgba(33,188,238,0)_0%,rgba(5,38,152,1)_100%)]" />
                <article className="relative z-10 flex w-full flex-col items-start px-3.5 pb-6 pt-[264px]">
                  <h3 className="flex min-h-[115.74px] items-center self-stretch [font-family:'DM_Sans',Helvetica] text-white text-[62.4px] font-bold leading-[58.5px] tracking-[0]">
                    {card.title}
                  </h3>
                  <p className="flex min-h-[136.55px] items-center self-stretch [font-family:'Poppins',Helvetica] text-white text-[18.2px] font-normal leading-[normal] tracking-[0]">
                    {card.description}
                  </p>
                </article>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
