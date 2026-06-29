import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Product } from "../api";

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const hasDiscount = product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      viewport={{ once: true }}
    >
      <Link
        to={`/produits/${product.slug}`}
        className="group block bg-void border border-ash/50 rounded-lg overflow-hidden transition-all duration-500 hover:border-blood/40 hover:shadow-[0_0_30px_rgba(255,0,64,0.15)]"
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-smoke">
          <img
            src={product.image_url || `https://placehold.co/600x800/111111/ff0040?text=${encodeURIComponent(product.title)}`}
            alt={product.image_alt || product.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent opacity-60" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.is_exclusive && (
              <span className="px-2 py-1 bg-phantom/90 text-white text-[10px] font-bold tracking-widest uppercase rounded">
                Evil Ed
              </span>
            )}
            {product.is_featured && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blood/90 text-white text-[10px] font-bold tracking-widest uppercase rounded">
                <Star className="w-3 h-3" fill="currentColor" />
                Vedette
              </span>
            )}
            {hasDiscount && (
              <span className="px-2 py-1 bg-green-600/90 text-white text-[10px] font-bold tracking-widest uppercase rounded">
                Promo
              </span>
            )}
          </div>

          {/* Quick info on hover */}
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
            <p className="text-xs text-bone/80 line-clamp-2">{product.short_desc}</p>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[10px] tracking-widest uppercase text-blood/70 mb-1">
            {product.category_name}
          </p>
          <h3 className="font-display text-lg tracking-wide text-white leading-tight line-clamp-2 group-hover:text-blood transition-colors">
            {product.title}
          </h3>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-xl text-blood">
              {parseFloat(product.price).toFixed(2)} €
            </span>
            {hasDiscount && (
              <span className="text-sm text-bone/40 line-through">
                {parseFloat(product.compare_price!).toFixed(2)} €
              </span>
            )}
          </div>
          {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
            <p className="mt-2 text-[10px] text-blood/70 animate-pulse-glow">
              Plus que {product.stock_quantity} en stock
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
