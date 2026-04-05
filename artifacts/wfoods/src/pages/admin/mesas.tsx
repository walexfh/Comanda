import { AdminLayout } from "@/components/admin-layout";
import { useListTables, useCreateTable, useDeleteTable, getListTablesQueryKey, useListOrders } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, QrCode, Download, Copy, RotateCcw, History } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getMenuUrl(tenantSlug: string, tableNumber: number) {
  return `${window.location.origin}/menu/${tenantSlug}?mesa=${tableNumber}`;
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const METHOD_LABELS: Record<string, string> = {
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  pix: "Pix",
};

export default function AdminMesas() {
  const { data: tables, isLoading } = useListTables();
  const { data: finalizedOrders } = useListOrders({ status: "finalizado" });
  const createTable = useCreateTable();
  const deleteTable = useDeleteTable();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tenantSlug = user?.tenantSlug ?? "";

  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [qrTable, setQrTable] = useState<{ number: number; label?: string | null } | null>(null);
  const [reopenLoading, setReopenLoading] = useState<number | null>(null);

  const tableMap = useMemo(() => {
    const map: Record<number, { number: number; label?: string | null }> = {};
    tables?.forEach(t => { map[t.id] = { number: t.number, label: t.label }; });
    return map;
  }, [tables]);

  const historySessions = useMemo(() => {
    if (!finalizedOrders || finalizedOrders.length === 0) return [];

    const SESSION_GAP_MS = 2 * 60 * 60 * 1000;

    const byTable: Record<number, typeof finalizedOrders> = {};
    for (const order of finalizedOrders) {
      if (!order.tableId) continue;
      if (!byTable[order.tableId]) byTable[order.tableId] = [];
      byTable[order.tableId].push(order);
    }

    const sessions: { tableId: number; tableNumber: number; orders: typeof finalizedOrders; closedAt: string; total: number }[] = [];

    for (const [tableIdStr, orders] of Object.entries(byTable)) {
      const tableId = parseInt(tableIdStr);
      const tableNumber = tableMap[tableId]?.number ?? tableId;

      const sorted = [...orders].sort((a, b) =>
        new Date(a.updatedAt ?? a.createdAt).getTime() - new Date(b.updatedAt ?? b.createdAt).getTime()
      );

      let currentCluster: typeof finalizedOrders = [];
      let clusterAnchor = new Date(sorted[0].updatedAt ?? sorted[0].createdAt).getTime();

      for (const order of sorted) {
        const t = new Date(order.updatedAt ?? order.createdAt).getTime();
        if (currentCluster.length > 0 && t - clusterAnchor > SESSION_GAP_MS) {
          const latestInCluster = currentCluster[currentCluster.length - 1];
          sessions.push({
            tableId,
            tableNumber,
            orders: currentCluster,
            closedAt: latestInCluster.updatedAt ?? latestInCluster.createdAt,
            total: currentCluster.reduce((sum, o) => sum + parseFloat(String(o.total ?? 0)), 0),
          });
          currentCluster = [];
          clusterAnchor = t;
        }
        currentCluster.push(order);
      }

      if (currentCluster.length > 0) {
        const latestInCluster = currentCluster[currentCluster.length - 1];
        sessions.push({
          tableId,
          tableNumber,
          orders: currentCluster,
          closedAt: latestInCluster.updatedAt ?? latestInCluster.createdAt,
          total: currentCluster.reduce((sum, o) => sum + parseFloat(String(o.total ?? 0)), 0),
        });
      }
    }

    return sessions.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
  }, [finalizedOrders, tableMap]);

  const handleCreate = () => {
    const num = parseInt(newNumber, 10);
    if (isNaN(num)) { toast.error("Número inválido"); return; }
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
    navigator.clipboard.writeText(getMenuUrl(tenantSlug, tableNumber));
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

  const handleReopen = async (tableId: number, orderIds: number[]) => {
    setReopenLoading(tableId);
    try {
      const token = localStorage.getItem("wfoods_token");
      const base = import.meta.env.BASE_URL ?? "/";
      const res = await fetch(`${base}api/tables/${tableId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderIds }),
      });
      if (!res.ok) throw new Error();
      toast.success("Mesa reaberta! Os pedidos voltaram para 'Pronto'.");
      queryClient.invalidateQueries();
    } catch {
      toast.error("Erro ao reabrir mesa");
    } finally {
      setReopenLoading(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mesas</h1>
      </div>

      <Tabs defaultValue="mesas">
        <TabsList className="mb-6">
          <TabsTrigger value="mesas">Mesas</TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mesas">
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
                      <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-primary" title="Copiar link do menu" onClick={() => handleCopyLink(table.number)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-primary" title="Baixar QR Code" onClick={() => handleDownloadQR(table.number)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-foreground" title="Ver QR Code ampliado" onClick={() => setQrTable({ number: table.number, label: table.label })}>
                        <QrCode className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-destructive hover:text-destructive/90 hover:bg-destructive/10" title="Excluir mesa" onClick={() => handleDelete(table.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
              {(!tables || tables.length === 0) && (
                <div className="col-span-full text-center py-12 text-muted-foreground">Nenhuma mesa cadastrada.</div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mesas com pedidos finalizados. Use "Reabrir" para reverter um fechamento feito por engano — os pedidos voltam para o status "Pronto".
            </p>

            {historySessions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum histórico de mesa encontrado.</p>
              </div>
            ) : (
              historySessions.map(session => (
                <Card key={session.tableId} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg">Mesa {session.tableNumber}</span>
                          <Badge variant="secondary" className="text-xs bg-gray-500/10 text-gray-400">
                            Fechada
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(session.closedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} •{" "}
                          {session.orders.length} pedido{session.orders.length !== 1 ? "s" : ""} •{" "}
                          Total: <span className="font-medium text-foreground">{formatCurrency(session.total)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {session.orders.slice(0, 5).flatMap(o => o.items).slice(0, 6).map((item, i) => (
                            <span key={i} className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                              {item.quantity}x {item.productName}
                            </span>
                          ))}
                          {session.orders.flatMap(o => o.items).length > 6 && (
                            <span className="text-xs text-primary">+{session.orders.flatMap(o => o.items).length - 6} mais</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 flex-shrink-0"
                        disabled={reopenLoading === session.tableId}
                        onClick={() => handleReopen(session.tableId, session.orders.map(o => o.id))}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {reopenLoading === session.tableId ? "Reabrindo..." : "Reabrir"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

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
              <p className="text-xs text-muted-foreground break-all px-2">{getMenuUrl(tenantSlug, qrTable.number)}</p>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={() => handleCopyLink(qrTable.number)}>
                  <Copy className="w-4 h-4 mr-2" />Copiar Link
                </Button>
                <Button className="flex-1" onClick={() => {
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
                }}>
                  <Download className="w-4 h-4 mr-2" />Baixar PNG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden QR canvases for direct download */}
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
