import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, User, BookOpen, Menu, X, Skull, Package, LogIn, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { token, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!token) {
      setCartCount(0);
      return;
    }
    (async () => {
      try {
        const cart = await api.getCart(token);
        setCartCount(cart.count);
      } catch { /* ignore */ }
    })();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { to: "/produits", label: "Catalogue" },
    { to: "/fanzine", label: "Fanzine" },
  ];

  const authLinks = [
    { to: "/panier", label: "Panier", icon: ShoppingCart, badge: cartCount },
    { to: "/commandes", label: "Commandes", icon: Package },
    { to: "/bibliotheque", label: "Bibliothèque", icon: BookOpen },
    { to: "/profil", label: "Profil", icon: User },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-abyss/95 backdrop-blur-xl border-b border-blood/20"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div whileHover={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}>
              <Skull className="w-8 h-8 text-blood group-hover:text-blood-glow transition-colors" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="font-display text-2xl tracking-wider text-white leading-none">
                LA PETITE MAISON
              </h1>
              <p className="text-[10px] tracking-[0.4em] text-blood uppercase font-body">
                de l'épouvante
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-display text-lg tracking-wide transition-all hover:text-blood ${
                  location.pathname.startsWith(link.to)
                    ? "text-blood neon-text-red"
                    : "text-bone"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {authLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="relative group p-2">
                    <link.icon
                      className={`w-5 h-5 transition-colors ${
                        location.pathname === link.to ? "text-blood" : "text-bone group-hover:text-blood"
                      }`}
                    />
                    {link.badge ? (
                      <span className="absolute -top-1 -right-1 bg-blood text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {link.badge}
                      </span>
                    ) : null}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs text-bone/50 hover:text-blood transition-colors ml-2"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="font-display text-sm tracking-wider px-5 py-2 border border-blood/50 text-blood hover:bg-blood hover:text-white transition-all duration-300 glow-hover-red flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                CONNEXION
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-bone">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-void/98 backdrop-blur-xl border-t border-blood/10 overflow-hidden"
            >
              <div className="px-6 py-6 space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="block font-display text-xl tracking-wide text-bone hover:text-blood"
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="border-ash" />
                {isAuthenticated ? (
                  <>
                    {authLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 text-bone hover:text-blood"
                      >
                        <link.icon className="w-5 h-5" />
                        <span className="font-display tracking-wide">{link.label}</span>
                        {link.badge ? (
                          <span className="bg-blood text-white text-xs px-2 py-0.5 rounded-full">{link.badge}</span>
                        ) : null}
                      </Link>
                    ))}
                    <button
                      onClick={() => { handleLogout(); setMenuOpen(false); }}
                      className="flex items-center gap-3 text-bone hover:text-blood w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-display tracking-wide">Déconnexion</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full font-display tracking-wider py-3 border border-blood text-blood hover:bg-blood hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-5 h-5" />
                    CONNEXION
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

    </>
  );
}
