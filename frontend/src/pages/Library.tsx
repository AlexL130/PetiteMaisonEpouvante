import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, Lock } from "lucide-react";
import { api, type FanzineIssue } from "../api";
import { useAuth } from "../hooks/useAuth";

export default function Library() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [owned, setOwned] = useState<FanzineIssue[]>([]);
  const [free, setFree] = useState<FanzineIssue[]>([]);
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const data = await api.getLibrary(token);
        setOwned(data.owned as FanzineIssue[]);
        setFree(data.free_previews);
      } catch { /* */ }
      setLoading(false);
    })();
  }, [token]);

  async function readIssue(id: number) {
    if (!token) return;
    try {
      const data = await api.readIssue(token, id);
      setReading(data.pdf_url);
    } catch { /* */ }
  }

  if (!isAuthenticated) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <Lock className="w-12 h-12 text-phantom/30 mx-auto mb-4" />
      <h1 className="font-display text-4xl text-white mb-4">MA BIBLIOTHÈQUE</h1>
      <p className="text-bone/50 mb-8">Connectez-vous pour accéder à vos numéros</p>
      <button onClick={() => navigate("/login")} className="font-display tracking-wider px-8 py-4 bg-phantom text-white hover:bg-phantom-glow transition-all">CONNEXION</button>
    </div>
  );

  const allIssues = [...owned, ...free.filter(f => !owned.some(o => o.id === f.id))];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl tracking-wider text-white mb-10">
        <BookOpen className="inline-block w-10 h-10 text-phantom mr-4" />
        MA BIBLIOTHÈQUE
      </motion.h1>

      {reading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10 p-6 bg-void border border-phantom/30 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display text-xl text-phantom">LISEUSE</h3>
            <button onClick={() => setReading(null)} className="text-sm text-bone/50 hover:text-blood">Fermer</button>
          </div>
          <div className="aspect-[3/4] max-h-[80vh] bg-smoke rounded overflow-hidden flex items-center justify-center">
            <p className="text-bone/50 text-center p-8">
              <ExternalLink className="w-8 h-8 mx-auto mb-3 text-phantom" />
              Liseuse PDF intégrée<br />
              <a href={reading} target="_blank" rel="noreferrer" className="text-phantom hover:text-phantom-glow mt-2 inline-block">
                Ouvrir le PDF →
              </a>
            </p>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="animate-pulse aspect-[2/3] bg-smoke rounded-lg" />)}
        </div>
      ) : allIssues.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-display text-2xl text-bone/40">Aucun numéro dans votre bibliothèque</p>
          <p className="text-bone/30 mt-2">Abonnez-vous pour accéder aux numéros</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {allIssues.map((issue, i) => (
            <motion.div key={issue.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <button onClick={() => readIssue(issue.id)} className="w-full text-left group">
                <div className="aspect-[2/3] bg-smoke rounded-lg overflow-hidden border border-ash/30 group-hover:border-phantom/40 transition-all relative">
                  <img src={issue.cover_url} alt={issue.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-abyss/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="font-display text-lg text-phantom tracking-wider">LIRE</span>
                  </div>
                </div>
                <p className="mt-2 font-display text-sm text-white group-hover:text-phantom transition-colors">{issue.title}</p>
                <p className="text-[10px] text-bone/40">N°{issue.issue_number}</p>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
