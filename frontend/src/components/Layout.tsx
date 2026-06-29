import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { Skull } from "lucide-react";

export default function Layout() {
  return (
    <div className="min-h-screen bg-abyss noise-overlay">
      <Navbar />
      <main className="relative z-0 pt-20">
        <Outlet />
      </main>
      <footer className="relative z-0 border-t border-ash mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Skull className="w-6 h-6 text-blood" />
              <span className="font-display text-lg tracking-wider text-bone">
                LA PETITE MAISON DE L'ÉPOUVANTE
              </span>
            </div>
            <div className="flex gap-8 text-sm text-bone/50">
              <span>Angoulême</span>
              <span>Aix-en-Provence</span>
              <span>Lyon</span>
              <span>London</span>
            </div>
            <p className="text-xs text-bone/30">
              © {new Date().getFullYear()} — Le lieu de rêve pour frissonner
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
