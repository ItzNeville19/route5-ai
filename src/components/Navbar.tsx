"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#problem", label: "Problem", id: "problem" },
  { href: "#solution", label: "Platform", id: "solution" },
  { href: "#capabilities", label: "Capabilities", id: "capabilities" },
  { href: "#security", label: "Security", id: "security" },
  { href: "#roi", label: "ROI", id: "roi" },
];

const containerVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -10, x: -10 },
  visible: { opacity: 1, y: 0, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, x: -10, transition: { duration: 0.2 } },
};

const buttonVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.3 } },
};

/**
 * Route5 Logo Component — Highway shield with "5"
 */
function Route5Logo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className="flex-shrink-0"
    >
      {/* Shield background */}
      <path
        d="M14 2 L22 6 L22 14 C22 19 14 25 14 25 C14 25 6 19 6 14 L6 6 Z"
        fill="#0071e3"
      />
      {/* "5" text */}
      <text
        x="14"
        y="18"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        5
      </text>
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());

  // Handle scroll for frosted glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section detection using Intersection Observer
  useEffect(() => {
    const handleIntersection = (sectionId: string, isVisible: boolean) => {
      if (isVisible) {
        setActiveSection(sectionId);
      }
    };

    navLinks.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            handleIntersection(id, entry.isIntersecting);
          },
          {
            threshold: [0.3],
            rootMargin: "-50% 0px -50% 0px",
          }
        );
        observer.observe(element);
        observersRef.current.set(id, observer);
      }
    });

    return () => {
      observersRef.current.forEach((observer) => observer.disconnect());
      observersRef.current.clear();
    };
  }, []);

  const handleMobileNavClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "nav-frosted-dark" : "bg-transparent"
        }`}
      >
        <div className="container-apple px-6 lg:px-12">
          <div className="flex items-center justify-between h-[56px]">
            {/* Logo */}
            <motion.a
              href="/"
              className="flex items-center gap-2.5 flex-shrink-0"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Route5Logo />
              <span className="text-[16px] font-semibold tracking-[-0.03em] text-white hidden sm:inline">
                Route5
              </span>
            </motion.a>

            {/* Desktop nav — centered */}
            <div className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              {navLinks.map((link) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="relative text-[13px] font-medium text-[#86868b] hover:text-white transition-colors duration-200 tracking-[-0.01em] whitespace-nowrap"
                  whileHover="hover"
                  initial="rest"
                  animate={activeSection === link.id ? "active" : "rest"}
                >
                  {link.label}

                  {/* Hover underline */}
                  <motion.span
                    className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-white origin-left"
                    variants={{
                      rest: { scaleX: 0 },
                      hover: { scaleX: 1 },
                      active: { scaleX: 1 },
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  {/* Active indicator */}
                  {activeSection === link.id && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-[#0071e3]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
              <motion.a
                href="#contact"
                className="text-[13px] font-medium text-[#86868b] hover:text-white transition-colors duration-200 tracking-[-0.01em]"
                whileHover={{ scale: 1.05 }}
              >
                Contact
              </motion.a>
              <motion.a
                href="#contact"
                className="btn-primary text-[13px] font-medium tracking-[-0.01em] px-4 py-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Request a Briefing
              </motion.a>
            </div>

            {/* Mobile toggle */}
            <motion.button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-[#86868b] hover:text-white transition-colors"
              aria-label="Toggle menu"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={20} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
            >
              <motion.div
                className="px-6 py-6 space-y-1"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {navLinks.map((link) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={handleMobileNavClick}
                    className="block text-[15px] text-[#86868b] hover:text-white py-3 border-b border-white/8 last:border-0 tracking-[-0.022em] relative group"
                    variants={itemVariants}
                    whileHover={{ paddingLeft: 8 }}
                  >
                    {link.label}
                    <motion.span
                      className="absolute bottom-3 left-0 h-0.5 bg-white"
                      initial={{ width: 0 }}
                      whileHover={{ width: "100%" }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.a>
                ))}

                <motion.a
                  href="#contact"
                  onClick={handleMobileNavClick}
                  className="btn-primary block w-full text-center py-3 text-[15px] font-medium mt-6 tracking-[-0.022em]"
                  variants={buttonVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Request a Briefing
                </motion.a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
