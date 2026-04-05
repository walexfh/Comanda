import { AdminLayout } from "@/components/admin-layout";
import { useListTables, useCreateTable, useDeleteTable } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListTablesQueryKey } from "@workspace/api-client-react";

export default function AdminMesas() {
  const { data: tables, isLoading } = useListTables();
  const createTable = useCreateTable();
  const deleteTable = useDeleteTable();
  const queryClient = useQueryClient();

  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleCreate = () => {
    const num = parseInt(newNumber, 10);
    if (isNaN(num)) {
      toast.error("Número inválido");
      return;
    }
    createTable.mutate(
      { data: { number: num, label: newLabel } },
      {
        onSuccess: () => {
          toast.success("Mesa criada");
          setNewNumber("");
          setNewLabel("");
          queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
        },
        onError: () => toast.error("Erro ao criar mesa"),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta mesa?")) return;
    deleteTable.mutate(
      { tableId: id },
      {
        onSuccess: () => {
          toast.success("Mesa excluída");
          queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
        },
        onError: () => toast.error("Erro ao excluir mesa"),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mesas</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Adicionar Nova Mesa</CardTitle>
          <CardDescription>Crie uma nova mesa para o seu restaurante.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label htmlFor="number">Número da Mesa</Label>
              <Input 
                id="number" 
                type="number" 
                value={newNumber} 
                onChange={(e) => setNewNumber(e.target.value)} 
                placeholder="Ex: 12" 
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <Label htmlFor="label">Rótulo (Opcional)</Label>
              <Input 
                id="label" 
                value={newLabel} 
                onChange={(e) => setNewLabel(e.target.value)} 
                placeholder="Ex: Varanda" 
              />
            </div>
            <Button onClick={handleCreate} disabled={createTable.isPending} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Mesa
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables?.map((table) => (
            <Card key={table.id} className="flex flex-col text-center">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-3xl text-primary">{table.number}</CardTitle>
                {table.label && <CardDescription>{table.label}</CardDescription>}
              </CardHeader>
              <CardContent className="p-4 pt-2 flex-1">
                <div className="text-xs text-muted-foreground mt-2">
                  Status: <span className={table.active ? "text-green-500" : "text-red-500"}>{table.active ? "Ativa" : "Inativa"}</span>
                </div>
              </CardContent>
              <CardFooter className="p-2 flex justify-between bg-muted/50 border-t">
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
                  const url = `${window.location.origin}/menu/placeholder-tenant-slug?table=${table.number}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link do Menu copiado!");
                }}>
                  <QrCode className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90" onClick={() => handleDelete(table.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          {(!tables || tables.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhuma mesa cadastrada.
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
