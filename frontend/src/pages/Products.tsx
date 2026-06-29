import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { api, type Product, type Category } from "../api";
import ProductCard from "../components/ProductCard";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCategory = searchParams.get("category") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const sort = searchParams.get("sort") || "created_at";

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(searchParams);
    if (!params.has("limit")) params.set("limit", "20");
    api.getProducts(params.toString())
      .then((data) => { setProducts(data.products); setTotal(data.pagination.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchParams]);

  function updateParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete("page");
    setSearchParams(p);
  }

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", search);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-5xl tracking-wider text-white mb-2">CATALOGUE</h1>
        <p className="text-bone/50 text-sm">{total} produit{total > 1 ? "s" : ""}</p>
      </motion.div>

      {/* Search + Filter bar */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <form onSubmit={doSearch} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-bone/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full pl-11 pr-4 py-3 bg-void border border-ash/50 rounded-lg text-mist placeholder:text-bone/30 focus:border-blood/50 focus:outline-none transition-colors"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(""); updateParam("search", ""); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-bone/40 hover:text-blood" />
            </button>
          )}
        </form>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-2 px-5 py-3 border rounded-lg transition-all ${
            filtersOpen ? "border-blood/50 text-blood bg-blood/5" : "border-ash/50 text-bone hover:border-blood/30"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="font-display tracking-wide text-sm">FILTRES</span>
        </button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-6 bg-void/80 border border-ash/30 rounded-lg space-y-4"
        >
          {/* Categories */}
          <div>
            <p className="text-xs tracking-widest text-bone/50 uppercase mb-3">Catégorie</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateParam("category", "")}
                className={`px-3 py-1.5 text-xs font-display tracking-wider rounded border transition-all ${
                  !activeCategory ? "border-blood text-blood bg-blood/10" : "border-ash/50 text-bone/60 hover:border-blood/30"
                }`}
              >
                TOUS
              </button>
              {categories.filter((c) => !c.parent_id).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateParam("category", cat.slug)}
                  className={`px-3 py-1.5 text-xs font-display tracking-wider rounded border transition-all ${
                    activeCategory === cat.slug ? "border-blood text-blood bg-blood/10" : "border-ash/50 text-bone/60 hover:border-blood/30"
                  }`}
                >
                  {cat.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-xs tracking-widest text-bone/50 uppercase mb-3">Trier par</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "created_at", label: "RÉCENT" },
                { value: "price", label: "PRIX ↑" },
                { value: "title", label: "A → Z" },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateParam("sort", s.value)}
                  className={`px-3 py-1.5 text-xs font-display tracking-wider rounded border transition-all ${
                    sort === s.value ? "border-phantom text-phantom bg-phantom/10" : "border-ash/50 text-bone/60 hover:border-phantom/30"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Products grid */}
      <div className="mt-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-smoke rounded-lg" />
                <div className="mt-3 h-4 bg-smoke rounded w-3/4" />
                <div className="mt-2 h-4 bg-smoke rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-2xl text-bone/40">Aucun produit trouvé</p>
            <p className="text-bone/30 mt-2">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-10 flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / 20) }).map((_, i) => (
            <button
              key={i}
              onClick={() => { const p = new URLSearchParams(searchParams); p.set("page", String(i + 1)); setSearchParams(p); }}
              className={`w-10 h-10 font-display text-sm rounded border transition-all ${
                page === i + 1 ? "border-blood text-blood bg-blood/10" : "border-ash/50 text-bone/60 hover:border-blood/30"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
