import { useState, useCallback } from "react";
import { CATS, PRODS, type CartItem } from "@/data/products";
import Header from "@/components/Header";
import CategoryGrid from "@/components/CategoryGrid";
import CategoryModal from "@/components/CategoryModal";
import CartPanel from "@/components/CartPanel";
import ProductCard from "@/components/ProductCard";

const Index = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const cartCount = cart.reduce((a, i) => a + i.c, 0);

  const addToCart = useCallback((pid: number, option: string, qty: number) => {
    const p = PRODS.find(x => x[0] === pid);
    if (!p) return;
    const key = `${pid}-${option}`;
    setCart(prev => {
      const ex = prev.find(i => i.key === key);
      if (ex) return prev.map(i => i.key === key ? { ...i, c: i.c + qty } : i);
      return [...prev, { key, pid, n: p[2], o: option, c: qty, l1: p[7][option][0], l2: p[7][option][1], unidad: p[4] }];
    });
  }, []);

  const changeCartQty = (key: string, delta: number) => {
    setCart(prev => prev.map(i => i.key === key ? { ...i, c: Math.max(1, i.c + delta) } : i));
  };

  const deleteItem = (key: string) => {
    setCart(prev => prev.filter(i => i.key !== key));
  };

  // Search results view
  const searchResults = search ? PRODS.filter(p =>
    p[2].toLowerCase().includes(search.toLowerCase()) || p[3].toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />

      <div className="max-w-[1200px] mx-auto p-4">
        <div className="relative mb-4">
          <input
            type="text"
            className="w-full bg-card border-2 border-border rounded-3xl py-2.5 pl-4 pr-11 text-sm text-foreground outline-none focus:border-primary shadow-sm transition-colors"
            placeholder="Buscar productos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base pointer-events-none">🔍</span>
        </div>

        {search ? (
          <div>
            <h1 className="text-xl text-azul-dark mb-3 font-bold">Resultados para "{search}"</h1>
            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No se encontraron productos 🔍</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {searchResults.map(p => (
                  <ProductCard key={p[0]} product={p} onAddToCart={addToCart} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-xl text-azul-dark mb-3 font-bold">Categorías</h1>
            <CategoryGrid categories={CATS} onSelect={setActiveCat} />
          </>
        )}
      </div>

      {activeCat && (
        <CategoryModal
          catId={activeCat}
          onClose={() => setActiveCat(null)}
          onAddToCart={addToCart}
          searchTerm=""
        />
      )}

      <CartPanel
        cart={cart}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onChangeQty={changeCartQty}
        onDelete={deleteItem}
      />
    </div>
  );
};

export default Index;
