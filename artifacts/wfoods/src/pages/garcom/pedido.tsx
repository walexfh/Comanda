import { GarcomLayout } from "@/components/garcom-layout";
import { useGetTenant, useListProducts, useCreateOrder, useListCategories, useListTables } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, ShoppingCart, Trash2, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  notes?: string;
}

export default function GarcomPedido() {
  const { tableId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const { data: categories } = useListCategories();
  const { data: products } = useListProducts({ available: true });
  const { data: tables } = useListTables();
  const createOrder = useCreateOrder();

  const tableNumber = tables?.find(t => t.id === parseInt(tableId!))?.number ?? tableId;

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [openNoteFor, setOpenNoteFor] = useState<number | null>(null);

  const updateNote = (productId: number, note: string) => {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, notes: note } : i));
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === null || p.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, productName: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const handleSubmit = () => {
    if (cart.length === 0) return;
    if (!user) return;

    createOrder.mutate(
      {
        data: {
          tenantSlug: user.tenantSlug,
          tableId: parseInt(tableId!),
          customerName: customerName || undefined,
          items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes
          }))
        }
      },
      {
        onSuccess: () => {
          toast.success("Pedido enviado com sucesso!");
          setLocation("/garcom");
        },
        onError: () => toast.error("Erro ao enviar pedido")
      }
    );
  };

  return (
    <GarcomLayout title={`Mesa ${tableNumber}`}>
      <div className="flex flex-col h-full">
        <div className="flex-none p-2 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-primary">Mesa {tableNumber}</h2>
            <Input 
              placeholder="Nome do cliente (opcional)" 
              className="max-w-[200px] h-8 text-sm"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar produtos..." 
              className="pl-9 bg-card h-12 text-lg"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
            <Button 
              variant={activeCategory === null ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveCategory(null)}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            {categories?.map(c => (
              <Button 
                key={c.id}
                variant={activeCategory === c.id ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveCategory(c.id)}
                className="whitespace-nowrap"
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-card border border-border p-3 rounded-lg flex justify-between items-center" onClick={() => addToCart(product)}>
              <div>
                <div className="font-bold text-lg">{product.name}</div>
                <div className="text-accent font-medium">{formatCurrency(product.price)}</div>
              </div>
              <Button size="icon" className="h-10 w-10 rounded-full" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Nenhum produto encontrado.</div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="flex-none bg-card border-t border-border shadow-lg mt-auto">
            <div className="max-h-56 overflow-y-auto p-2 space-y-2 bg-muted/20">
              {cart.map(item => (
                <div key={item.productId} className="bg-background rounded border border-border overflow-hidden">
                  <div className="flex items-center justify-between p-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{item.productName}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{formatCurrency(item.price)}</span>
                        {item.notes && (
                          <span className="text-xs text-amber-400 truncate max-w-[120px]" title={item.notes}>
                            📝 {item.notes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${openNoteFor === item.productId ? "text-amber-400" : "text-muted-foreground"} hover:text-amber-400`}
                        title="Adicionar observação"
                        onClick={() => setOpenNoteFor(openNoteFor === item.productId ? null : item.productId)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      <div className="flex items-center gap-0.5 bg-muted rounded-full px-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(item.productId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-4 text-center font-bold text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(item.productId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.productId)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {openNoteFor === item.productId && (
                    <div className="px-2 pb-2 flex gap-1.5 border-t border-border/50 pt-1.5 bg-amber-500/5">
                      <Input
                        autoFocus
                        placeholder="Ex: sem cebola, bem passado, sem açúcar..."
                        value={item.notes ?? ""}
                        onChange={e => updateNote(item.productId, e.target.value)}
                        className="h-8 text-sm border-amber-500/30 focus-visible:ring-amber-500/30"
                        onKeyDown={e => e.key === "Enter" && setOpenNoteFor(null)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground"
                        onClick={() => setOpenNoteFor(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-3 bg-primary text-primary-foreground flex justify-between items-center">
              <div className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {cart.reduce((a, b) => a + b.quantity, 0)} itens
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xl font-bold">{formatCurrency(cartTotal)}</div>
                <Button variant="secondary" size="lg" className="font-bold shadow-md" onClick={handleSubmit} disabled={createOrder.isPending}>
                  {createOrder.isPending ? "Enviando..." : "ENVIAR"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GarcomLayout>
  );
}
