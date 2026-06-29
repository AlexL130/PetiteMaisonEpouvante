import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { api, type Order } from "../api";
import { useAuth } from "../hooks/useAuth";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  CONFIRMED: "text-blue-400 border-blue-400/30 bg-blue-400/5",
  SHIPPED: "text-phantom border-phantom/30 bg-phantom/5",
  DELIVERED: "text-green-500 border-green-500/30 bg-green-500/5",
  CANCELLED: "text-bone/40 border-ash bg-ash/5",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente", CONFIRMED: "Confirmée", SHIPPED: "Expédiée", DELIVERED: "Livrée", CANCELLED: "Annulée",
};

export default function Orders() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, Order>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      try { setOrders(await api.getOrders(token)); } catch { /* */ }
      setLoading(false);
    })();
  }, [token]);

  async function toggleExpand(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    if (!details[id]) {
      if (!token) return;
      const detail = await api.getOrder(token, id);
      setDetails(d => ({ ...d, [id]: detail }));
    }
    setExpanded(id);
  }

  if (!isAuthenticated) return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <Package className="w-12 h-12 text-blood/30 mx-auto mb-4" />
      <h1 className="font-display text-4xl text-white mb-4">MES COMMANDES</h1>
      <p className="text-bone/50 mb-8">Connectez-vous pour voir vos commandes</p>
      <button onClick={() => navigate("/login")} className="font-display tracking-wider px-8 py-4 bg-blood text-white">CONNEXION</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl tracking-wider text-white mb-10">
        MES COMMANDES
      </motion.h1>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="animate-pulse h-20 bg-smoke rounded-lg" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-blood/20 mx-auto mb-4" />
          <p className="font-display text-2xl text-bone/40">Aucune commande</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <button onClick={() => toggleExpand(order.id)} className="w-full text-left p-5 bg-void border border-ash/30 rounded-lg hover:border-blood/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-display text-xl text-white">#{order.id}</span>
                    <span className={`text-[10px] tracking-widest uppercase px-2 py-1 rounded border ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-bone/50">{new Date(order.created_at).toLocaleDateString("fr-FR")}</span>
                    <span className="font-display text-lg text-blood">{parseFloat(order.total_amount).toFixed(2)} €</span>
                    {expanded === order.id ? <ChevronUp className="w-4 h-4 text-bone/40" /> : <ChevronDown className="w-4 h-4 text-bone/40" />}
                  </div>
                </div>
              </button>

              {expanded === order.id && details[order.id] && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-1 p-5 bg-smoke/30 border border-ash/20 rounded-b-lg space-y-3">
                  {details[order.id].items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="w-12 h-14 bg-smoke rounded overflow-hidden">
                        {item.image_url && <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{item.title}</p>
                        <p className="text-xs text-bone/40">x{item.quantity}</p>
                      </div>
                      <p className="text-sm text-bone">{(parseFloat(item.price) * item.quantity).toFixed(2)} €</p>
                    </div>
                  ))}
                  <hr className="border-ash/30" />
                  <div className="flex justify-between text-sm">
                    <span className="text-bone/50">Livraison</span>
                    <span className="text-bone">{parseFloat(details[order.id].shipping_cost).toFixed(2)} €</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
