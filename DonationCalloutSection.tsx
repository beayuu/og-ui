import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";

const donationAmounts = [
  "₱ 20.00",
  "₱ 50.00",
  "₱ 100.00",
  "₱ 200.00",
  "₱ 500.00",
  "₱ 1000.00",
];

const QR_METHODS = [
  { id: "gcash", label: "GCash", color: "#0078FF" },
  { id: "maya", label: "Maya", color: "#22C55E" },
] as const;

export const DonationCalloutSection = (): JSX.Element => {
  const [donationValue, setDonationValue] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const getNumeric = (raw: string) =>
    raw.replace(/[₱\s,]/g, "").trim();

  const handleAmountClick = (amount: string) => {
    setSelectedAmount(amount);
    setDonationValue(amount);
  };

  const handleQrRedirect = (method: "gcash" | "maya") => {
    const raw = donationValue || selectedAmount || "";
    const numeric = getNumeric(raw);
    if (!numeric || isNaN(Number(numeric))) return;
    const params = new URLSearchParams({ method, amount: numeric });
    setLocation(`/donate/qr?${params}`);
  };

  const handleSubmit = () => {
    const raw = donationValue || selectedAmount || "";
    const numeric = getNumeric(raw);
    if (numeric) {
      setLocation(`/donate?amount=${encodeURIComponent(numeric)}`);
    } else {
      setLocation("/donate");
    }
  };

  const hasAmount = Boolean(donationValue || selectedAmount);

  return (
    <section className="relative w-full">
      <div className="mx-auto flex w-full max-w-[721px] flex-col items-center gap-[24px] px-4 py-6 sm:gap-[28px] md:gap-[32px] lg:gap-[36px]">
        <header className="flex w-full justify-center">
          <h2 className="mt-[-1.00px] text-center [font-family:'Inter',Helvetica] text-[72px] font-bold leading-[0.9] tracking-[0] text-black sm:text-[88px] md:text-[104px] lg:text-[117.2px]">
            Donate
          </h2>
        </header>
        <p className="w-full max-w-[593px] text-left [font-family:'Poppins',Helvetica] text-[18.2px] font-normal leading-[normal] tracking-[0] text-black">
          Every peso counts. Your gift directly funds coral fragment cultivation,
          reef monitoring expeditions, and the training of local dive volunteers
          who protect our ocean communities every day.
        </p>

        {/* Amount grid */}
        <div className="grid w-full max-w-[593px] grid-cols-2 gap-x-[22px] gap-y-[18px] sm:gap-y-[24px] md:grid-cols-3 md:gap-y-[41px]">
          {donationAmounts.map((amount) => {
            const active = selectedAmount === amount;
            return (
              <Card
                key={amount}
                className={`group relative overflow-hidden rounded-[5px] border-0 shadow-[0px_5px_20px_-2px_#00000040] transition-colors duration-200 before:pointer-events-none before:absolute before:inset-0 before:rounded-[5px] before:p-[1px] before:content-[''] before:[background:linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[-webkit-mask-composite:xor] before:[mask-composite:exclude] ${
                  active
                    ? "bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] before:[background:#ffffff]"
                    : "bg-white hover:bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] hover:before:[background:#ffffff]"
                }`}
              >
                <CardContent className="flex h-[50px] items-center justify-center p-0">
                  <button
                    type="button"
                    onClick={() => handleAmountClick(amount)}
                    data-testid={`button-donation-${amount}`}
                    className={`h-full w-full bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] bg-clip-text text-center [font-family:'DM_Sans',Helvetica] text-[26px] font-bold leading-[normal] tracking-[0] text-transparent transition-colors duration-200 [-webkit-text-fill-color:transparent] sm:text-[28px] md:text-[32px] ${
                      active ? "bg-none [-webkit-text-fill-color:#ffffff]" : "group-hover:bg-none group-hover:[-webkit-text-fill-color:#ffffff]"
                    }`}
                  >
                    {amount}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Custom amount */}
        <Card className="relative w-full max-w-[593px] overflow-hidden rounded-[7.35px] border-0 bg-white shadow-[0px_7.35px_29.41px_-2.94px_#00000040] before:pointer-events-none before:absolute before:inset-0 before:rounded-[7.35px] before:p-[2.94px] before:content-[''] before:[background:linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[-webkit-mask-composite:xor] before:[mask-composite:exclude]">
          <CardContent className="p-0">
            <label htmlFor="donation-input" className="block">
              <Input
                id="donation-input"
                value={donationValue}
                onChange={(e) => { setDonationValue(e.target.value); setSelectedAmount(null); }}
                placeholder="Input amount:"
                data-testid="input-donation-amount"
                className="h-[50px] border-0 bg-transparent px-4 [font-family:'DM_Sans',Helvetica] text-[20.6px] font-bold leading-[normal] tracking-[0] text-black shadow-none outline-none ring-0 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </label>
          </CardContent>
        </Card>

        {/* QR buttons — shown when amount is selected */}
        {hasAmount && (
          <div className="flex w-full max-w-[593px] flex-col gap-3 animate-in fade-in duration-300">
            <p className="text-center text-sm font-semibold text-black/70">Pay via QR:</p>
            <div className="flex gap-3 justify-center">
              {QR_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`button-qr-${m.id}`}
                  onClick={() => handleQrRedirect(m.id)}
                  className="h-12 w-36 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:opacity-90"
                  style={{ backgroundColor: m.color }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-black/40">or fill the full form below ↓</p>
          </div>
        )}

        {/* Submit → full form */}
        <Button
          type="button"
          onClick={handleSubmit}
          data-testid="button-donate-submit"
          className="h-auto min-h-[50px] w-full max-w-[165px] rounded-[5px] border-0 bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] px-6 py-2 [font-family:'DM_Sans',Helvetica] text-[32px] font-bold leading-[normal] tracking-[0] text-white shadow-[0px_5px_20px_-2px_#00000040] hover:opacity-95"
        >
          Full Form
        </Button>
        <p className="w-full max-w-[593px] text-left [font-family:'Poppins',Helvetica] text-base font-medium italic leading-[normal] tracking-[0] text-black">
          Your contribution helps provide meals and resources for participants
          and mentors, keeping our reef restoration events running all year long.
        </p>
      </div>
    </section>
  );
};
