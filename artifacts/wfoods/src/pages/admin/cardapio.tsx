import { AdminLayout } from "@/components/admin-layout";
import { 
  useListCategories, 
  useListProducts, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListCategoriesQueryKey,
  getListProductsQueryKey
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminCardapio() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading: isCatLoading } = useListCategories();
  const { data: products, isLoading: isProdLoading } = useListProducts({});

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [activeTab, setActiveTab] = useState("produtos");
  
  // Category state
  const [catName, setCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  
  // Product state
  const [isProdDialogOpen, setIsProdDialogOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<number | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCat, setProdCat] = useState("");
  const [prodAvail, setProdAvail] = useState(true);
  const [prodSector, setProdSector] = useState("");

  const resetProdForm = () => {
    setEditingProdId(null);
    setProdName("");
    setProdDesc("");
    setProdPrice("");
    setProdCat("");
    setProdAvail(true);
    setProdSector("");
  };

  const handleSaveCategory = () => {
    if (!catName) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    if (editingCatId) {
      updateCategory.mutate(
        { categoryId: editingCatId, data: { name: catName } },
        {
          onSuccess: () => {
            toast.success("Categoria atualizada");
            setCatName("");
            setEditingCatId(null);
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          },
          onError: () => toast.error("Erro ao atualizar categoria")
        }
      );
    } else {
      createCategory.mutate(
        { data: { name: catName } },
        {
          onSuccess: () => {
            toast.success("Categoria criada");
            setCatName("");
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          },
          onError: () => toast.error("Erro ao criar categoria")
        }
      );
    }
  };

  const handleDeleteCategory = (id: number) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    deleteCategory.mutate(
      { categoryId: id },
      {
        onSuccess: () => {
          toast.success("Categoria excluída");
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        },
        onError: () => toast.error("Erro ao excluir categoria")
      }
    );
  };

  const handleSaveProduct = () => {
    if (!prodName || !prodPrice || !prodCat) {
      toast.error("Nome, Preço e Categoria são obrigatórios");
      return;
    }

    const data = {
      name: prodName,
      description: prodDesc,
      price: parseFloat(prodPrice),
      categoryId: parseInt(prodCat),
      available: prodAvail,
      printSector: prodSector || null
    };

    if (editingProdId) {
      updateProduct.mutate(
        { productId: editingProdId, data },
        {
          onSuccess: () => {
            toast.success("Produto atualizado");
            setIsProdDialogOpen(false);
            resetProdForm();
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          },
          onError: () => toast.error("Erro ao atualizar produto")
        }
      );
    } else {
      createProduct.mutate(
        { data },
        {
          onSuccess: () => {
            toast.success("Produto criado");
            setIsProdDialogOpen(false);
            resetProdForm();
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          },
          onError: () => toast.error("Erro ao criar produto")
        }
      );
    }
  };

  const handleDeleteProduct = (id: number) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    deleteProduct.mutate(
      { productId: id },
      {
        onSuccess: () => {
          toast.success("Produto excluído");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
        onError: () => toast.error("Erro ao excluir produto")
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Cardápio</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Seus Produtos</h2>
            <Dialog open={isProdDialogOpen} onOpenChange={(open) => {
              setIsProdDialogOpen(open);
              if (!open) resetProdForm();
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Novo Produto</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingProdId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="prodName">Nome</Label>
                    <Input id="prodName" value={prodName} onChange={e => setProdName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prodDesc">Descrição</Label>
                    <Input id="prodDesc" value={prodDesc} onChange={e => setProdDesc(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prodPrice">Preço (R$)</Label>
                      <Input id="prodPrice" type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prodCat">Categoria</Label>
                      <Select value={prodCat} onValueChange={setProdCat}>
                        <SelectTrigger id="prodCat">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prodSector">Setor de Impressão</Label>
                      <Select value={prodSector} onValueChange={setProdSector}>
                        <SelectTrigger id="prodSector">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cozinha">Cozinha</SelectItem>
                          <SelectItem value="bar">Bar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex flex-col justify-end pb-2">
                      <div className="flex items-center gap-2">
                        <Switch id="prodAvail" checked={prodAvail} onCheckedChange={setProdAvail} />
                        <Label htmlFor="prodAvail">Disponível</Label>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-4" onClick={handleSaveProduct}>Salvar Produto</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isProdLoading ? <div>Carregando...</div> : (
            <div className="grid gap-4">
              {products?.map((prod) => (
                <Card key={prod.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{prod.name}</h3>
                        {!prod.available && <span className="bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full">Indisponível</span>}
                      </div>
                      {prod.description && <p className="text-sm text-muted-foreground">{prod.description}</p>}
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="font-medium text-accent">{formatCurrency(prod.price)}</span>
                        <span className="text-muted-foreground">Cat: {categories?.find(c => c.id === prod.categoryId)?.name || 'N/A'}</span>
                        {prod.printSector && <span className="text-muted-foreground">Setor: {prod.printSector}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => {
                        setEditingProdId(prod.id);
                        setProdName(prod.name);
                        setProdDesc(prod.description || "");
                        setProdPrice(prod.price.toString());
                        setProdCat(prod.categoryId?.toString() || "");
                        setProdAvail(prod.available);
                        setProdSector(prod.printSector || "");
                        setIsProdDialogOpen(true);
                      }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive/90" onClick={() => handleDeleteProduct(prod.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!products || products.length === 0) && (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  Nenhum produto cadastrado.
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingCatId ? "Editar Categoria" : "Adicionar Categoria"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="catName">Nome da Categoria</Label>
                  <Input 
                    id="catName" 
                    value={catName} 
                    onChange={(e) => setCatName(e.target.value)} 
                    placeholder="Ex: Bebidas, Pratos Principais"
                  />
                </div>
                <div className="flex gap-2">
                  {editingCatId && (
                    <Button variant="outline" onClick={() => {
                      setEditingCatId(null);
                      setCatName("");
                    }}>Cancelar</Button>
                  )}
                  <Button onClick={handleSaveCategory}>
                    {editingCatId ? "Salvar Alterações" : "Adicionar Categoria"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isCatLoading ? <div>Carregando...</div> : (
            <div className="grid gap-2">
              {categories?.map((cat) => (
                <Card key={cat.id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <span className="font-medium text-lg">{cat.name}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingCatId(cat.id);
                        setCatName(cat.name);
                      }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive/90" onClick={() => handleDeleteCategory(cat.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!categories || categories.length === 0) && (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  Nenhuma categoria cadastrada.
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
