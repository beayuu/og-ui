import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState } from "react";
import { Menu, X, UserCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type NavItem = { label: string; path: string };

const navigationItems: readonly NavItem[] = [
  { label: "Home", path: "/" },
  { label: "Adopt", path: "/adopt" },
  { label: "Volunteer", path: "/volunteer" },
  { label: "Donate", path: "/donate" },
  { label: "Contacts", path: "/contacts" },
] as const;

export const NavigationBarSection = (): JSX.Element => {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const handleAccount = () => {
    setMobileOpen(false);
    if (isAuthenticated) {
      setLocation("/account");
    } else {
      setLocation("/auth");
    }
    window.scrollTo({ top: 0 });
  };

  const handleNavClick = (path: string) => {
    setMobileOpen(false);

    if (location === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLocation(path);
    window.scrollTo({ top: 0 });
  };

  const isActive = (path: string) => location === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex w-full justify-center px-3 py-4 sm:px-6 sm:py-[27px]">
      <nav
        aria-label="Primary"
        className="relative flex w-full max-w-[820px] flex-col rounded-[18px] bg-black backdrop-blur-[39.38px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(39.38px)_brightness(100%)]"
      >
        <div className="flex w-full items-center justify-between gap-3 px-[14px] py-[8px] sm:gap-6 sm:px-[18px] sm:py-[9px]">
          <button
            type="button"
            onClick={() => handleNavClick("/")}
            className="flex items-center gap-[9px] focus:outline-none"
            data-testid="link-logo"
          >
            <img
              className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
              alt="Logo"
              src="/figmaAssets/logo1.svg"
            />
            <span className="hidden [font-family:'Inter',Helvetica] text-[18px] font-normal leading-tight tracking-[-0.45px] text-white whitespace-nowrap sm:inline lg:text-[22.5px] lg:leading-[31.5px]">
              Adopt a Reef
            </span>
          </button>

          <div className="hidden items-center gap-4 lg:flex lg:gap-[27px]">
            {navigationItems.map((item) => {
              const active = isActive(item.path);
              return active ? (
                <Button
                  key={item.label}
                  type="button"
                  variant="secondary"
                  onClick={() => handleNavClick(item.path)}
                  data-testid={`button-nav-${item.label.toLowerCase()}`}
                  className="h-auto rounded-[9px] bg-white px-[13.5px] py-[9px] text-center [font-family:'Inter',Helvetica] text-base font-medium leading-tight tracking-[-0.09px] text-black hover:bg-white lg:text-lg lg:leading-[26.1px]"
                >
                  {item.label}
                </Button>
              ) : (
                <Button
                  key={item.label}
                  type="button"
                  variant="ghost"
                  onClick={() => handleNavClick(item.path)}
                  data-testid={`button-nav-${item.label.toLowerCase()}`}
                  className="h-auto p-0 [font-family:'Inter',Helvetica] text-base font-medium leading-tight tracking-[-0.09px] text-white hover:bg-transparent hover:text-white lg:text-lg lg:leading-[26.1px]"
                >
                  {item.label}
                </Button>
              );
            })}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleAccount}
                data-testid="button-nav-account"
                aria-label="Account"
                className="flex items-center gap-2 rounded-full p-1 text-white transition-colors hover:bg-white/10 focus:outline-none"
              >
                <span className="hidden [font-family:'Inter',Helvetica] text-sm font-medium text-white/80 xl:inline">
                  {user?.username}
                </span>
                <UserCircle2 className="h-7 w-7" />
              </button>
            ) : (
              <Button
                type="button"
                onClick={handleAccount}
                data-testid="button-nav-login"
                className="h-auto rounded-[9px] bg-white px-[13.5px] py-[9px] text-center [font-family:'Inter',Helvetica] text-base font-medium leading-tight tracking-[-0.09px] text-black hover:bg-white/90 lg:text-lg lg:leading-[26.1px]"
              >
                Log in
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus:outline-none lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="flex flex-col gap-1 border-t border-white/10 px-3 pb-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200 lg:hidden">
            {navigationItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  data-testid={`button-mobile-nav-${item.label.toLowerCase()}`}
                  className={`w-full rounded-md px-3 py-2 text-left [font-family:'Inter',Helvetica] text-base font-medium transition-colors ${
                    active
                      ? "bg-white text-black"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleAccount}
              data-testid="button-mobile-account"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left [font-family:'Inter',Helvetica] text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              <UserCircle2 className="h-5 w-5" />
              {isAuthenticated
                ? `Account${user?.username ? ` (${user.username})` : ""}`
                : "Log in"}
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};
