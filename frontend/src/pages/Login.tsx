import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Eye, EyeOff, Skull } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Skull className="w-12 h-12 text-blood mx-auto mb-4" />
          <h1 className="font-display text-4xl tracking-wider text-white">
            {mode === "login" ? "CONNEXION" : "INSCRIPTION"}
          </h1>
          <p className="text-bone/50 mt-2 font-accent italic">
            {mode === "login" ? "Entrez dans la maison..." : "Rejoignez la communaut\u00e9 de l'\u00e9pouvante"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "register" && (
            <div>
              <label className="block text-xs tracking-widest text-bone/50 uppercase mb-2">Nom d'affichage</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre pseudo"
                className="w-full px-4 py-3 bg-void border border-ash/50 rounded-lg text-mist placeholder:text-bone/30 focus:border-blood/50 focus:outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs tracking-widest text-bone/50 uppercase mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full px-4 py-3 bg-void border border-ash/50 rounded-lg text-mist placeholder:text-bone/30 focus:border-blood/50 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs tracking-widest text-bone/50 uppercase mb-2">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-void border border-ash/50 rounded-lg text-mist placeholder:text-bone/30 focus:border-blood/50 focus:outline-none transition-colors pr-12"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-bone/40 hover:text-blood">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === "register" && <p className="text-[10px] text-bone/40 mt-1">Minimum 8 caracteres</p>}
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-blood bg-blood/10 border border-blood/20 rounded-lg px-4 py-2">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 font-display text-lg tracking-wider py-4 bg-blood text-white hover:bg-blood-glow transition-all disabled:opacity-60"
          >
            {loading ? "..." : mode === "login" ? (
              <><LogIn className="w-5 h-5" /> SE CONNECTER</>
            ) : (
              <><UserPlus className="w-5 h-5" /> S'INSCRIRE</>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-bone/50">
          {mode === "login" ? (
            <>Pas encore de compte ? <button onClick={() => { setMode("register"); setError(""); }} className="text-blood hover:text-blood-glow transition-colors">Inscrivez-vous</button></>
          ) : (
            <>Deja un compte ? <button onClick={() => { setMode("login"); setError(""); }} className="text-blood hover:text-blood-glow transition-colors">Connectez-vous</button></>
          )}
        </p>
      </motion.div>
    </div>
  );
}
