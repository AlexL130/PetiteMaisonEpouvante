import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronRight, Flame, BookOpen, ShoppingBag, ChevronLeft } from "lucide-react";
import { api, type Product, type FanzineIssue } from "../api";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [issues, setIssues] = useState<FanzineIssue[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    api.getFeatured().then(setFeatured).catch(() => {});
    api.getFanzineIssues().then(setIssues).catch(() => {});
  }, []);

  return (
    <>
      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax BG */}
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-abyss/30 via-abyss/60 to-abyss z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,64,0.15),transparent_70%)]" />
          <img
            src="https://placehold.co/1920x1080/0a0a0a/1a1a1a?text=."
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
        </motion.div>

        {/* Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-20 text-center px-6 max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-blood tracking-[0.5em] text-sm uppercase mb-6 font-body"
          >
            Le lieu de rêve pour frissonner
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 80 }}
            className="font-display text-6xl sm:text-8xl md:text-9xl tracking-wider text-white neon-text-red leading-none"
          >
            LA PETITE
            <br />
            <span className="text-blood">MAISON</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-lg text-bone/60 font-accent italic max-w-xl mx-auto"
          >
            Figurines, films cultes, bandes dessinées, jeux de société
            <br />& le fanzine qui fait frissonner depuis 10 ans.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/produits"
              className="inline-flex items-center gap-2 font-display text-lg tracking-wider px-8 py-4 bg-blood text-white hover:bg-blood-glow transition-all duration-300 glow-hover-red"
            >
              <ShoppingBag className="w-5 h-5" />
              EXPLORER LE CATALOGUE
            </Link>
            <Link
              to="/fanzine"
              className="inline-flex items-center gap-2 font-display text-lg tracking-wider px-8 py-4 border border-phantom/50 text-phantom hover:bg-phantom hover:text-white transition-all duration-300"
            >
              <BookOpen className="w-5 h-5" />
              DÉCOUVRIR LE FANZINE
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronRight className="w-6 h-6 text-blood/60 rotate-90" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ FEATURED PRODUCTS ═══════ */}
      {featured.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 mb-10"
            >
              <Flame className="w-6 h-6 text-blood" />
              <h2 className="font-display text-4xl tracking-wider text-white">
                EN VEDETTE
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-blood/40 to-transparent" />
              <Link to="/produits?featured=true" className="text-sm text-blood hover:text-blood-glow transition-colors flex items-center gap-1">
                Tout voir <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <HorizontalScroll>
              {featured.map((product, i) => (
                <div key={product.id} className="min-w-[250px] sm:min-w-[280px]">
                  <ProductCard product={product} index={i} />
                </div>
              ))}
            </HorizontalScroll>
          </div>
        </section>
      )}

      {/* ═══════ FANZINE SECTION ═══════ */}
      {issues.length > 0 && (
        <section className="py-20 px-6 bg-void/50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 mb-10"
            >
              <BookOpen className="w-6 h-6 text-phantom" />
              <h2 className="font-display text-4xl tracking-wider text-white">
                LE FANZINE
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-phantom/40 to-transparent" />
              <Link to="/fanzine" className="text-sm text-phantom hover:text-phantom-glow transition-colors flex items-center gap-1">
                Tous les numéros <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {issues.slice(0, 6).map((issue, i) => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link
                    to="/fanzine"
                    className="group block rounded-lg overflow-hidden border border-ash/30 hover:border-phantom/40 transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                  >
                    <div className="aspect-[2/3] bg-smoke relative overflow-hidden">
                      <img
                        src={issue.cover_url}
                        alt={issue.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {issue.is_free_preview && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-600 text-white text-[9px] font-bold tracking-widest uppercase rounded">
                          Gratuit
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-phantom/70 tracking-widest">N°{issue.issue_number}</p>
                      <h4 className="font-display text-sm text-white leading-tight mt-0.5 group-hover:text-phantom transition-colors">
                        {issue.title}
                      </h4>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ CTA SECTION ═══════ */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(124,58,237,0.1),transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-5xl md:text-6xl tracking-wider text-white mb-6">
            ABONNEZ-VOUS <br />
            <span className="text-phantom neon-text-violet">AU FANZINE</span>
          </h2>
          <p className="text-bone/60 font-accent italic text-lg mb-8">
            4 numéros par an, des dossiers exclusifs sur l'horreur, le fantastique et l'heroic fantasy.
            <br />Disponible en version papier, numérique ou les deux.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/fanzine"
              className="font-display tracking-wider px-8 py-4 bg-phantom text-white hover:bg-phantom-glow transition-all"
            >
              DÉCOUVRIR LES OFFRES
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}

// Horizontal scrollable container (Netflix-style)
function HorizontalScroll({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-abyss/80 border border-ash/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:border-blood/50"
      >
        <ChevronLeft className="w-5 h-5 text-bone" />
      </button>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-abyss/80 border border-ash/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:border-blood/50"
      >
        <ChevronRight className="w-5 h-5 text-bone" />
      </button>
    </div>
  );
}
