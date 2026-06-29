import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Save, Shield } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";

export default function Profile() {
  const { isAuthenticated, token, user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ id: number; email: string; display_name: string; avatar_url: string; roles: string[] } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const p = await api.getProfile(token);
        setProfile(p);
        setDisplayName(p.display_name || "");
      } catch { /* */ }
    })();
  }, [token]);

  async function save() {
    setSaving(true);
    if (!token) return;
    try {
      await api.updateProfile(token, { display_name: displayName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* */ }
    setSaving(false);
  }

  if (!isAuthenticated) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <User className="w-12 h-12 text-blood/30 mx-auto mb-4" />
      <h1 className="font-display text-4xl text-white mb-4">MON PROFIL</h1>
      <button onClick={() => navigate("/login")} className="font-display tracking-wider px-8 py-4 bg-blood text-white">CONNEXION</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl tracking-wider text-white mb-10">
        MON PROFIL
      </motion.h1>

      <div className="flex items-center gap-6 mb-10">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blood/30 bg-smoke">
          {(profile?.avatar_url) && (
            <img src={profile?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <p className="font-display text-2xl text-white">{profile?.display_name || user?.displayName || "Utilisateur"}</p>
          <p className="text-sm text-bone/50">{profile?.email || user?.email}</p>
          {profile?.roles && (
            <div className="flex gap-2 mt-2">
              {profile.roles.map((role) => (
                <span key={role} className="flex items-center gap-1 text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border border-phantom/30 text-phantom bg-phantom/5">
                  <Shield className="w-3 h-3" />
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-void border border-ash/30 rounded-lg space-y-6">
        <div>
          <label className="block text-xs tracking-widest text-bone/50 uppercase mb-2">Nom d'affichage</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-smoke border border-ash/50 rounded-lg text-mist focus:border-blood/50 focus:outline-none transition-colors"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 font-display tracking-wider px-6 py-3 bg-blood text-white hover:bg-blood-glow transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saved ? "ENREGISTRÉ ✓" : saving ? "..." : "ENREGISTRER"}
        </button>
      </div>

      <div className="mt-8 p-6 bg-void border border-ash/30 rounded-lg">
        <h3 className="font-display text-xl tracking-wider text-white mb-4">INFORMATIONS</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-bone/40">ID</p>
            <p className="text-mist">#{profile?.id}</p>
          </div>
          <div>
            <p className="text-bone/40">Email</p>
            <p className="text-mist">{profile?.email}</p>
          </div>
          <div>
            <p className="text-bone/40">Rôles</p>
            <p className="text-mist">{profile?.roles?.join(", ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
