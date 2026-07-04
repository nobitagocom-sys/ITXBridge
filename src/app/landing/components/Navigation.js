"use client";
import { Icon } from "@/shared/components";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
          onClick={() => router.push("/")}
          aria-label="Navigate to home"
        >
          <div className="size-8 rounded bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white">
            <Icon name="hub" size={20} />
          </div>
          <h2 className="text-white text-xl font-bold tracking-tight">ITXBridge</h2>
        </button>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-8">
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#features">Features</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#how-it-works">How it Works</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="https://github.com/decolua/itxbridge#readme" target="_blank" rel="noopener noreferrer">Docs</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors flex items-center gap-1" href="https://github.com/decolua/itxbridge" target="_blank" rel="noopener noreferrer">
            GitHub <Icon name="open_in_new" size={14} />
          </a>
        </div>

        {/* CTA + Mobile menu */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard")}
            className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 bg-[#5E6AD2] hover:bg-[#4b56b8] transition-all text-[#0a0a0a] text-sm font-bold shadow-[0_0_15px_rgba(94,106,210,0.4)] hover:shadow-[0_0_20px_rgba(94,106,210,0.6)]"
          >
            Get Started
          </button>
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2a2a2a] bg-[#0a0a0a]/95 backdrop-blur-md">
          <div className="flex flex-col gap-4 p-6">
            <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
            <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="https://github.com/decolua/itxbridge#readme" target="_blank" rel="noopener noreferrer">Docs</a>
            <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="https://github.com/decolua/itxbridge" target="_blank" rel="noopener noreferrer">GitHub</a>
            <button 
              onClick={() => router.push("/dashboard")}
              className="h-9 rounded-lg bg-[#5E6AD2] hover:bg-[#4b56b8] text-[#0a0a0a] text-sm font-bold"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

