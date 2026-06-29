import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, ChevronLeft, Check, AlertCircle, Star } from "lucide-react";
import { api, type Product } from "../api";
import { useAuth } from "../hooks/useAuth";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getProduct(slug).then(setProduct).catch(() => setError("Produit introuvable")).finally(() => setLoading(false));
  }, [slug]);

  async function addToCart() {
    if (!isAuthenticated) { return; }
    if (!product || !token) return;
    setAdding(true); setError("");
    try {
      await api.addToCart(token, product.id, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally { setAdding(false); }
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="animate-pulse grid md:grid-cols-2 gap-12">
        <div className="aspect-[3/4] bg-smoke rounded-lg" />
        <div className="space-y-4"><div className="h-8 bg-smoke rounded w-3/4" /><div className="h-4 bg-smoke rounded w-1/2" /><div className="h-40 bg-smoke rounded" /></div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="max-w-7xl mx-auto px-6 py-20 text-center">
      <p className="font-display text-3xl text-bone/40">Produit introuvable</p>
      <Link to="/produits" className="text-blood mt-4 inline-block">← Retour au catalogue</Link>
    </div>
  );

  const images = product.images || [{ id: 0, url: product.image_url || "", alt_text: product.title, position: 0, is_primary: true }];
  const attrs = product.attributes as Record<string, unknown>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link to="/produits" className="inline-flex items-center gap-2 text-sm text-bone/50 hover:text-blood transition-colors mb-8">
        <ChevronLeft className="w-4 h-4" /> Retour au catalogue
      </Link>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Gallery */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <div className="aspect-[3/4] bg-smoke rounded-lg overflow-hidden border border-ash/30 relative group">
            <img
              src={images[selectedImage]?.url}
              alt={images[selectedImage]?.alt_text}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {product.is_exclusive && (
              <span className="absolute top-4 left-4 px-3 py-1.5 bg-phantom text-white text-xs font-bold tracking-widest uppercase rounded">
                Exclusivité Evil Ed
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 mt-4">
              {images.map((img, i) => (
                <button key={img.id} onClick={() => setSelectedImage(i)}
                  className={`w-20 h-24 rounded overflow-hidden border-2 transition-all ${i === selectedImage ? "border-blood" : "border-ash/30 hover:border-blood/30"}`}
                >
                  <img src={img.url} alt={img.alt_text} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <p className="text-xs tracking-[0.3em] text-blood/70 uppercase">{product.category_name}</p>
          <h1 className="font-display text-4xl md:text-5xl tracking-wider text-white mt-2 leading-tight">{product.title}</h1>

          {product.is_featured && (
            <div className="flex items-center gap-2 mt-3">
              <Star className="w-4 h-4 text-blood" fill="currentColor" />
              <span className="text-xs text-blood tracking-widest uppercase">Produit vedette</span>
            </div>
          )}

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-4xl text-blood">{parseFloat(product.price).toFixed(2)} €</span>
            {product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price) && (
              <span className="text-lg text-bone/40 line-through">{parseFloat(product.compare_price).toFixed(2)} €</span>
            )}
          </div>

          <p className="mt-6 text-bone/70 leading-relaxed font-accent">{product.description}</p>

          {/* Attributes */}
          {Object.keys(attrs).length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {Object.entries(attrs).map(([key, val]) => (
                <div key={key} className="px-3 py-2 bg-smoke/50 rounded border border-ash/20">
                  <p className="text-[10px] text-bone/40 tracking-widest uppercase">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm text-mist mt-0.5">{String(val)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Stock */}
          <div className="mt-6">
            {product.stock_quantity > 0 ? (
              <p className="text-sm text-green-500 flex items-center gap-2">
                <Check className="w-4 h-4" />
                En stock ({product.stock_quantity} disponible{product.stock_quantity > 1 ? "s" : ""})
              </p>
            ) : (
              <p className="text-sm text-blood flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Rupture de stock
              </p>
            )}
          </div>

          {/* Add to cart */}
          {product.stock_quantity > 0 && (
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center border border-ash/50 rounded">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 text-bone hover:text-blood transition-colors">−</button>
                <span className="px-4 py-3 font-display text-white min-w-[3rem] text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))} className="px-4 py-3 text-bone hover:text-blood transition-colors">+</button>
              </div>
              <button
                onClick={addToCart}
                disabled={adding || added}
                className={`flex-1 flex items-center justify-center gap-3 font-display text-lg tracking-wider py-4 px-8 transition-all duration-300 ${
                  added
                    ? "bg-green-600 text-white"
                    : "bg-blood text-white hover:bg-blood-glow glow-hover-red"
                } disabled:opacity-60`}
              >
                {added ? <><Check className="w-5 h-5" /> AJOUTÉ</> : <><ShoppingCart className="w-5 h-5" /> {adding ? "..." : "AJOUTER AU PANIER"}</>}
              </button>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-blood">{error}</p>}
        </motion.div>
      </div>
    </div>
  );
}
