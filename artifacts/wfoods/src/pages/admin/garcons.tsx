import { AdminLayout } from "@/components/admin-layout";
import { useListWaiters, useCreateWaiter, useDeleteWaiter } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListWaitersQueryKey } from "@workspace/api-client-react";

export default function AdminGarcons() {
  const { data: waiters, isLoading } = useListWaiters();
  const createWaiter = useCreateWaiter();
  const deleteWaiter = useDeleteWaiter();
  const queryClient = useQueryClient();

  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleCreate = () => {
    if (!newName || !newPassword) {
      toast.error("Nome e senha são obrigatórios");
      return;
    }
    createWaiter.mutate(
      { data: { name: newName, password: newPassword } },
      {
        onSuccess: () => {
          toast.success("Garçom cadastrado");
          setNewName("");
          setNewPassword("");
          queryClient.invalidateQueries({ queryKey: getListWaitersQueryKey() });
        },
        onError: () => toast.error("Erro ao cadastrar garçom"),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este garçom?")) return;
    deleteWaiter.mutate(
      { waiterId: id },
      {
        onSuccess: () => {
          toast.success("Garçom excluído");
          queryClient.invalidateQueries({ queryKey: getListWaitersQueryKey() });
        },
        onError: () => toast.error("Erro ao excluir garçom"),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Garçons</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Adicionar Garçom</CardTitle>
          <CardDescription>Cadastre um novo garçom para acessar a comanda.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <Label htmlFor="name">Nome do Garçom</Label>
              <Input 
                id="name" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="Ex: João Silva" 
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label htmlFor="password">Senha de Acesso</Label>
              <Input 
                id="password" 
                type="password"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="••••••••" 
              />
            </div>
            <Button onClick={handleCreate} disabled={createWaiter.isPending} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {waiters?.map((waiter) => (
            <Card key={waiter.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold">{waiter.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {waiter.id}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => handleDelete(waiter.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
          {(!waiters || waiters.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum garçom cadastrado.
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
