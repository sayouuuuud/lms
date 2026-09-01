"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Moon, Sun, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { CartButton } from "@/components/cart/cart-button";
import { useCart } from "@/components/cart/cart-provider";
import type { NavbarContent } from "@/lib/site-content-defaults";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={
        isDark
          ? "التبديل إلى الوضع الفاتح (معمل الزمرد)"
          : "التبديل إلى الوضع الداكن (نيون الكيمياء)"
      }
      aria-label={
        isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"
      }
      className={cn(
        "group relative grid size-10 place-items-center rounded-full transition-all duration-300",
        "border border-navy/15 bg-white/70 text-navy hover:border-brand/40 hover:bg-purple-50 hover:text-brand shadow-sm",
        "dark:border-white/15 dark:bg-white/5 dark:text-teal-glow dark:hover:border-brand/40 dark:hover:bg-white/10 dark:hover:text-brand dark:shadow-[0_0_15px_rgba(218, 173, 76,0.15)]",
        className,
      )}
    >
      <div className="relative size-5">
        <Sun
          className={cn(
            "absolute inset-0 size-5 transition-all duration-300",
            mounted && isDark
              ? "rotate-0 scale-100 opacity-100 text-brand"
              : "-rotate-90 scale-0 opacity-0",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 size-5 transition-all duration-300",
            mounted && isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100 text-navy group-hover:text-brand",
          )}
        />
      </div>
    </button>
  );
}

export function LandingNavbar({
  isLoggedIn = false,
  content = DEFAULT_SITE_CONTENT.navbar,
}: {
  isLoggedIn?: boolean;
  content?: NavbarContent;
}) {
  const [open, setOpen] = useState(false);
  const { loggedIn: cartLoggedIn } = useCart();

  const isUserLoggedIn = isLoggedIn || cartLoggedIn;

  return (
    <header className="absolute inset-x-0 top-0 z-50 w-full border-b border-navy/10 bg-[#fbfaf6]/90 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-[#0a0f1a]/85">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          {content.logoUrl ? (
            <Image
              src={content.logoUrl}
              alt={content.siteName}
              width={40}
              height={40}
              className="size-10 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <span className="grid size-10 place-items-center rounded-lg bg-brand text-navy shadow-[0_0_15px_rgba(218, 173, 76,0.3)] transition-transform duration-300 hover:scale-105 dark:bg-brand dark:text-[#0a0f1a] dark:shadow-[0_0_15px_#daad4c88]">
              <FlaskConical className="size-5" />
            </span>
          )}
          <span className="font-heading text-xl font-bold text-navy dark:text-white">
            {content.siteName}
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {content.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative text-sm font-semibold text-navy/80 transition-colors hover:text-brand dark:text-slate-300 dark:hover:text-brand"
            >
              {l.label}
              <span className="absolute -bottom-1.5 right-0 h-0.5 w-0 bg-brand transition-all duration-300 group-hover:w-full dark:bg-brand" />
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <CartButton className="text-navy hover:bg-navy/5 dark:text-white dark:hover:bg-white/10" />
          {isUserLoggedIn ? (
            <Link
              href="/auth"
              className="inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 bg-brand text-navy shadow-md hover:bg-brand shadow-brand/20 dark:bg-brand dark:text-[#0a0f1a] dark:shadow-[0_0_20px_#daad4c66]"
            >
              {content.ctaAccountText}
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="rounded-xl px-4 py-2 text-sm font-bold text-navy transition-colors hover:bg-navy/5 dark:text-white dark:hover:bg-white/10"
              >
                {content.ctaLoginText}
              </Link>
              <Link
                href="/auth?mode=register"
                className="inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 bg-brand text-navy shadow-md hover:bg-brand shadow-brand/20 dark:bg-brand dark:text-[#0a0f1a] dark:shadow-[0_0_20px_#daad4c66]"
              >
                {content.ctaRegisterText}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle className="size-9" />
          <CartButton className="text-navy dark:text-white" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-lg text-navy transition-colors hover:bg-navy/5 dark:text-white dark:hover:bg-white/10"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-navy/10 bg-[#fbfaf6]/95 px-5 py-5 shadow-xl backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-[#0a0f1a]/95">
          <div className="flex flex-col gap-1.5">
            {content.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2.5 text-base font-semibold text-navy/80 transition-colors hover:bg-brand/10 hover:text-brand dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-teal-glow"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex gap-2 border-t border-navy/10 pt-3 dark:border-white/10">
              {isUserLoggedIn ? (
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl bg-brand px-6 py-2.5 text-center text-base font-bold text-navy shadow-md dark:bg-brand dark:text-[#0a0f1a]"
                >
                  {content.ctaAccountText}
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-navy/15 px-5 py-2.5 text-center text-base font-bold text-navy hover:bg-navy/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                  >
                    {content.ctaLoginText}
                  </Link>
                  <Link
                    href="/auth?mode=register"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl bg-brand px-5 py-2.5 text-center text-base font-bold text-navy shadow-md dark:bg-brand dark:text-[#0a0f1a]"
                  >
                    {content.ctaRegisterText}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
