import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";

export default function Checkout() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shipping_name: "", shipping_address: "", shipping_city: "", shipping_zip: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shipping_name || !form.shipping_address || !form.shipping_city || !form.shipping_zip) {
      setError("Tous les champs sont obligatoires"); return;
    }
    setLoading(true); setError("");
    try {
      if (!token) return;
      await api.checkout(token, form);
      setSuccess(true);
      setTimeout(() => navigate("/commandes"), 2000);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  if (success) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-white" />
      </motion.div>
      <h1 className="font-display text-4xl text-white">COMMANDE CONFIRMÉE</h1>
      <p className="text-bone/50 mt-4">Redirection vers vos commandes...</p>
    </div>
  );

  const fields = [
    { key: "shipping_name", label: "Nom complet", placeholder: "Jean Dupont" },
    { key: "shipping_address", label: "Adresse", placeholder: "12 rue du Manoir Hanté" },
    { key: "shipping_city", label: "Ville", placeholder: "Angoulême" },
    { key: "shipping_zip", label: "Code postal", placeholder: "16000" },
  ];

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl tracking-wider text-white mb-10">
        LIVRAISON
      </motion.h1>

      <form onSubmit={submit} className="space-y-6">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs tracking-widest text-bone/50 uppercase mb-2">{f.label}</label>
            <input
              value={form[f.key as keyof typeof form]}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 bg-void border border-ash/50 rounded-lg text-mist placeholder:text-bone/30 focus:border-blood/50 focus:outline-none transition-colors"
            />
          </div>
        ))}

        {error && <p className="text-sm text-blood">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full font-display text-lg tracking-wider py-4 bg-blood text-white hover:bg-blood-glow transition-all glow-hover-red disabled:opacity-60 flex items-center justify-center gap-3"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> TRAITEMENT...</> : "CONFIRMER LA COMMANDE"}
        </button>
      </form>
    </div>
  );
}
