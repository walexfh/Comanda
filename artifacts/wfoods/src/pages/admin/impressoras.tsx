import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Copy, CheckCheck, ExternalLink, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const SECTORS = [
  {
    key: "cozinha",
    label: "Cozinha",
    emoji: "🍳",
    description: "Recebe pedidos de pratos quentes, lanches e alimentos preparados.",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/5",
    badgeClass: "bg-orange-500/10 text-orange-400",
  },
  {
    key: "bar",
    label: "Bar",
    emoji: "🍺",
    description: "Recebe pedidos de bebidas, drinks, cervejas e coquetéis.",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/5",
    badgeClass: "bg-blue-500/10 text-blue-400",
  },
  {
    key: "caixa",
    label: "Caixa",
    emoji: "🧾",
    description: "Recebe comprovantes de fechamento de conta e pagamentos.",
    color: "text-green-400 border-green-500/30 bg-green-500/5",
    badgeClass: "bg-green-500/10 text-green-400",
  },
];

export default function AdminImpressoras() {
  const { user } = useAuth();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const getStationUrl = (sector: string) => {
    const base = window.location.origin + import.meta.env.BASE_URL;
    return `${base}print-station?sector=${sector}&slug=${user?.tenantSlug ?? ""}`;
  };

  const handleCopy = async (sector: string) => {
    await navigator.clipboard.writeText(getStationUrl(sector));
    setCopiedKey(sector);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpen = (sector: string) => {
    window.open(getStationUrl(sector), "_blank");
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Printer className="w-7 h-7" />
          Impressoras
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure impressoras de destino para cada setor do seu estabelecimento.
        </p>
      </div>

      {/* How it works */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">Como funciona</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Configure o <strong className="text-foreground">setor de impressão</strong> em cada produto (Cardápio → editar produto)</li>
              <li>Abra o <strong className="text-foreground">link da estação</strong> abaixo no computador conectado à impressora de cada setor</li>
              <li>Quando um garçom fizer um pedido, a <strong className="text-foreground">impressão acontece automaticamente</strong> naquela estação</li>
              <li>Deixe a aba sempre aberta — ela funciona em tempo real via conexão direta com o sistema</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Sector Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {SECTORS.map((sector) => (
          <Card key={sector.key} className={`border ${sector.color}`}>
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{sector.emoji}</span>
                  <CardTitle className="text-lg">{sector.label}</CardTitle>
                </div>
                <Badge variant="secondary" className={sector.badgeClass}>
                  Ativo
                </Badge>
              </div>
              <CardDescription className="mt-2">{sector.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <div className="rounded-md bg-muted p-2 text-xs font-mono text-muted-foreground break-all">
                {getStationUrl(sector.key)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => handleCopy(sector.key)}
                >
                  {copiedKey === sector.key ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Link
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleOpen(sector.key)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips */}
      <Card className="mt-6">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Dicas de configuração</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">🖨️ Impressora térmica</p>
            <p>Configure o navegador para imprimir automaticamente sem diálogo: nas configurações da impressora, defina como padrão e habilite impressão silenciosa.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">💻 Dispositivo dedicado</p>
            <p>Use um tablet ou computador fixo para cada setor. Deixe o navegador em tela cheia e desative o protetor de tela para não perder nenhum pedido.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">🔔 Notificação sonora</p>
            <p>A estação de impressão emite um som quando chega um pedido novo. Certifique-se de que o volume está ativo no dispositivo.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">📦 Sem setor configurado</p>
            <p>Produtos sem setor de impressão não são enviados a nenhuma impressora. Configure o setor de cada produto no Cardápio.</p>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
