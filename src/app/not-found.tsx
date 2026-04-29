import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <main className="route5-brand-marketing-page relative min-h-dvh w-full text-[#1d1d1f] antialiased">
      <Navbar />
      <div className="container-apple relative z-10 pb-32 pt-32 md:pt-40">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86868b]">404</p>
        <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
          Page not found
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[#6e6e73]">
          The page may have moved or the link is wrong. Use the navigation or pick a common destination
          below.
        </p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {[
            { href: "/", label: "Home" },
            { href: "/product", label: "Product" },
            { href: "/pricing", label: "Pricing" },
            { href: "/contact", label: "Contact" },
            { href: "/login", label: "Log in" },
          ].map((x) => (
            <li key={x.href}>
              <Link
                href={x.href}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/[0.08] bg-white/80 px-5 text-[14px] font-medium text-[#1d1d1f] shadow-sm transition hover:bg-white"
              >
                {x.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Footer tone="light" />
    </main>
  );
}
