import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Check, Crown } from "lucide-react";
import { api, type FanzineIssue, type Subscription } from "../api";
import { useAuth } from "../hooks/useAuth";

const PLANS = [
  { type: "DIGITAL", label: "Numérique", price: "19,99", desc: "4 numéros/an en PDF, accès liseuse intégrée" },
  { type: "PAPER", label: "Papier", price: "29,99", desc: "4 numéros/an livrés chez vous" },
  { type: "BOTH", label: "Papier + Numérique", price: "39,99", desc: "Le meilleur des deux mondes", featured: true },
];

export default function Fanzine() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<FanzineIssue[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [subscribing, setSubscribing] = useState("");

  useEffect(() => {
    api.getFanzineIssues().then(setIssues).catch(() => {});
    if (token) loadSubs();
  }, [token]);

  async function loadSubs() {
    if (!token) return;
    api.getSubscriptions(token).then(setSubs).catch(() => {});
  }

  async function subscribe(type: string) {
    if (!isAuthenticated) { navigate("/login"); return; }
    setSubscribing(type);
    try {
      if (!token) return;
      await api.subscribe(token, type);
      loadSubs();
    } catch { /* */ }
    setSubscribing("");
  }

  const activeSub = subs.find(s => s.status === "ACTIVE");

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-16">
        <BookOpen className="w-12 h-12 text-phantom mx-auto mb-4" />
        <h1 className="font-display text-6xl tracking-wider text-white">LE FANZINE</h1>
        <p className="mt-4 font-accent italic text-lg text-bone/60 max-w-xl mx-auto">
          Depuis 10 ans, le rendez-vous trimestriel des passionnés d'horreur, de fantastique et d'heroic fantasy.
        </p>
      </motion.div>

      {/* Subscription plans */}
      <div className="mb-20">
        <h2 className="font-display text-3xl tracking-wider text-white text-center mb-10">ABONNEMENTS</h2>
        {activeSub && (
          <div className="max-w-lg mx-auto mb-8 p-4 bg-phantom/10 border border-phantom/30 rounded-lg text-center">
            <p className="text-phantom font-display tracking-wider">ABONNÉ — {activeSub.type}</p>
            <p className="text-sm text-bone/50 mt-1">Valide jusqu'au {new Date(activeSub.end_date).toLocaleDateString("fr-FR")}</p>
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.type}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative p-6 rounded-lg border transition-all ${
                plan.featured
                  ? "border-phantom/50 bg-phantom/5 shadow-[0_0_30px_rgba(124,58,237,0.1)]"
                  : "border-ash/30 bg-void hover:border-phantom/30"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-phantom text-white text-[10px] font-bold tracking-widest uppercase rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Populaire
                </div>
              )}
              <h3 className="font-display text-2xl text-white tracking-wider">{plan.label.toUpperCase()}</h3>
              <div className="mt-4">
                <span className="font-display text-4xl text-phantom">{plan.price}</span>
                <span className="text-bone/50 text-sm"> €/an</span>
              </div>
              <p className="mt-3 text-sm text-bone/60">{plan.desc}</p>
              <button
                onClick={() => subscribe(plan.type)}
                disabled={!!activeSub || subscribing === plan.type}
                className={`mt-6 w-full font-display tracking-wider py-3 rounded transition-all ${
                  activeSub?.type === plan.type
                    ? "bg-phantom/20 text-phantom border border-phantom/30"
                    : plan.featured
                    ? "bg-phantom text-white hover:bg-phantom-glow"
                    : "border border-phantom/40 text-phantom hover:bg-phantom hover:text-white"
                } disabled:opacity-50`}
              >
                {activeSub?.type === plan.type ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> ACTIF</span>
                  : subscribing === plan.type ? "..." : "S'ABONNER"}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Issues grid */}
      <h2 className="font-display text-3xl tracking-wider text-white text-center mb-10">TOUS LES NUMÉROS</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {issues.map((issue, i) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            viewport={{ once: true }}
            className="group"
          >
            <div className="aspect-[2/3] bg-smoke rounded-lg overflow-hidden border border-ash/30 group-hover:border-phantom/40 transition-all group-hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] relative">
              <img src={issue.cover_url} alt={issue.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              {issue.is_free_preview && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-600 text-white text-[9px] font-bold tracking-widest uppercase rounded">Gratuit</span>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-abyss to-transparent">
                <p className="font-display text-sm text-white">{issue.title}</p>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <span className="text-[10px] text-phantom/60 tracking-widest">N°{issue.issue_number}</span>
              <span className="text-[10px] text-bone/40">{issue.page_count} pages</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
