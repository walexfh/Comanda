import { AdminLayout } from "@/components/admin-layout";
import { useListTables, useCreateTable, useDeleteTable, getListTablesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, QrCode, Download, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";

function getMenuUrl(tenantSlug: string, tableNumber: number) {
  return `${window.location.origin}/menu/${tenantSlug}?mesa=${tableNumber}`;
}

export default function AdminMesas() {
  const { data: tables, isLoading } = useListTables();
  const createTable = useCreateTable();
  const deleteTable = useDeleteTable();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tenantSlug = user?.tenantSlug ?? "";

  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const [qrTable, setQrTable] = useState<{ number: number; label?: string | null } | null>(null);

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

  const handleCopyLink = (tableNumber: number) => {
    const url = getMenuUrl(tenantSlug, tableNumber);
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleDownloadQR = (tableNumber: number) => {
    const canvas = document.getElementById(`qr-canvas-${tableNumber}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `mesa-${tableNumber}-qrcode.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`QR Code da Mesa ${tableNumber} baixado!`);
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
            <div className="space-y-2 w-full sm:w-32">
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                type="number"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="Ex: 12"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <Label htmlFor="label">Rótulo (Opcional)</Label>
              <Input
                id="label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Varanda, Mezanino"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
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
          {tables?.map((table) => {
            const menuUrl = getMenuUrl(tenantSlug, table.number);
            return (
              <Card key={table.id} className="flex flex-col text-center">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-3xl text-primary">{table.number}</CardTitle>
                  {table.label && <CardDescription>{table.label}</CardDescription>}
                </CardHeader>
                <CardContent className="p-4 pt-3 flex-1 flex flex-col items-center gap-2">
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setQrTable({ number: table.number, label: table.label })}
                    title="Clique para ampliar o QR Code"
                  >
                    <QRCodeCanvas
                      id={`qr-canvas-${table.number}`}
                      value={menuUrl}
                      size={96}
                      bgColor="#ffffff"
                      fgColor="#111111"
                      level="M"
                    />
                  </div>
                  <span className={`text-xs ${table.active ? "text-green-500" : "text-red-500"}`}>
                    {table.active ? "Ativa" : "Inativa"}
                  </span>
                </CardContent>
                <CardFooter className="p-2 flex justify-between bg-muted/50 border-t gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-muted-foreground hover:text-primary"
                    title="Copiar link do menu"
                    onClick={() => handleCopyLink(table.number)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-muted-foreground hover:text-primary"
                    title="Baixar QR Code"
                    onClick={() => handleDownloadQR(table.number)}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-muted-foreground hover:text-foreground"
                    title="Ver QR Code ampliado"
                    onClick={() => setQrTable({ number: table.number, label: table.label })}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    title="Excluir mesa"
                    onClick={() => handleDelete(table.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
          {(!tables || tables.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhuma mesa cadastrada.
            </div>
          )}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!qrTable} onOpenChange={(open) => !open && setQrTable(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>
              Mesa {qrTable?.number}
              {qrTable?.label && <span className="text-muted-foreground font-normal ml-2">— {qrTable.label}</span>}
            </DialogTitle>
          </DialogHeader>
          {qrTable && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="rounded-xl p-4 bg-white shadow-md">
                <QRCodeCanvas
                  id={`qr-dialog-${qrTable.number}`}
                  value={getMenuUrl(tenantSlug, qrTable.number)}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="M"
                  includeMargin
                />
              </div>
              <p className="text-xs text-muted-foreground break-all px-2">
                {getMenuUrl(tenantSlug, qrTable.number)}
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleCopyLink(qrTable.number)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    const canvas = document.getElementById(`qr-dialog-${qrTable.number}`) as HTMLCanvasElement | null;
                    if (!canvas) return;
                    const pngUrl = canvas.toDataURL("image/png");
                    const a = document.createElement("a");
                    a.href = pngUrl;
                    a.download = `mesa-${qrTable.number}-qrcode.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success("QR Code baixado!");
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PNG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden QR canvases for direct download (outside dialog) */}
      <div className="hidden">
        {tables?.map((table) => (
          <QRCodeCanvas
            key={table.id}
            id={`qr-download-${table.number}`}
            value={getMenuUrl(tenantSlug, table.number)}
            size={512}
            bgColor="#ffffff"
            fgColor="#111111"
            level="M"
            includeMargin
          />
        ))}
      </div>
    </AdminLayout>
  );
}
