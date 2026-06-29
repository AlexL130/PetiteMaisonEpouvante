import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { api, type CartItem } from "../api";
import { useAuth } from "../hooks/useAuth";

export default function Cart() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadCart() {
    if (!token) return;
    try {
      const data = await api.getCart(token);
      setItems(data.items);
      setSubtotal(data.subtotal);
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { if (token) loadCart(); else setLoading(false); }, [token]);

  async function updateQty(id: number, qty: number) {
    if (!token) return;
    await api.updateCartItem(token, id, qty);
    loadCart();
  }

  async function remove(id: number) {
    if (!token) return;
    await api.removeCartItem(token, id);
    loadCart();
  }

  if (!isAuthenticated) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <ShoppingBag className="w-16 h-16 text-blood/30 mx-auto mb-6" />
      <h1 className="font-display text-4xl text-white mb-4">VOTRE PANIER</h1>
      <p className="text-bone/50 mb-8">Connectez-vous pour voir votre panier</p>
      <button onClick={() => navigate("/login")} className="font-display tracking-wider px-8 py-4 bg-blood text-white hover:bg-blood-glow transition-all">CONNEXION</button>
    </div>
  );

  const shipping = subtotal >= 50 ? 0 : 5.99;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl tracking-wider text-white mb-10">
        PANIER
      </motion.h1>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="animate-pulse h-24 bg-smoke rounded-lg" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-16 h-16 text-blood/20 mx-auto mb-4" />
          <p className="font-display text-2xl text-bone/40">Votre panier est vide</p>
          <Link to="/produits" className="inline-block mt-6 text-blood hover:text-blood-glow transition-colors">Explorer le catalogue →</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 p-4 bg-void border border-ash/30 rounded-lg hover:border-blood/20 transition-colors"
              >
                <div className="w-20 h-24 bg-smoke rounded overflow-hidden flex-shrink-0">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/produits/${item.slug}`} className="font-display text-sm text-white hover:text-blood transition-colors line-clamp-1">
                    {item.title}
                  </Link>
                  <p className="text-blood font-display text-lg mt-1">{parseFloat(item.price).toFixed(2)} €</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border border-ash/40 rounded text-sm">
                      <button onClick={() => updateQty(item.id, Math.max(1, item.quantity - 1))} className="px-3 py-1 text-bone hover:text-blood">−</button>
                      <span className="px-2 text-white">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)} className="px-3 py-1 text-bone hover:text-blood">+</button>
                    </div>
                    <button onClick={() => remove(item.id)} className="p-1 text-bone/40 hover:text-blood transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-white">{(parseFloat(item.price) * item.quantity).toFixed(2)} €</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="p-6 bg-void border border-ash/30 rounded-lg sticky top-28">
              <h3 className="font-display text-xl tracking-wider text-white mb-6">RÉCAPITULATIF</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-bone/60">Sous-total</span><span className="text-white">{subtotal.toFixed(2)} €</span></div>
                <div className="flex justify-between">
                  <span className="text-bone/60">Livraison</span>
                  <span className="text-white">{shipping === 0 ? <span className="text-green-500">Gratuite</span> : `${shipping.toFixed(2)} €`}</span>
                </div>
                {shipping > 0 && <p className="text-[10px] text-bone/40">Livraison gratuite dès 50 €</p>}
                <hr className="border-ash" />
                <div className="flex justify-between font-display text-lg">
                  <span className="text-white">TOTAL</span>
                  <span className="text-blood">{(subtotal + shipping).toFixed(2)} €</span>
                </div>
              </div>
              <Link
                to="/checkout"
                className="mt-6 w-full flex items-center justify-center gap-2 font-display tracking-wider py-4 bg-blood text-white hover:bg-blood-glow transition-all glow-hover-red"
              >
                COMMANDER <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
