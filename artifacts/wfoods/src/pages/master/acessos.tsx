import { useState } from "react";
import { MasterLayout } from "@/components/master-layout";
import { useMasterAuth } from "@/lib/master-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, Mail, Phone, Building2, MapPin, Hash, PlusCircle, Eye, EyeOff } from "lucide-react";

interface RegistrationRequest {
  id: number;
  name: string;
  email: string;
  restaurantName: string;
  phone: string;
  cnpj: string;
  address: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CreateRestaurantDialogProps {
  request: RegistrationRequest | null;
  open: boolean;
  onClose: () => void;
  apiFetch: <T>(url: string, opts?: RequestInit) => Promise<T>;
  onSuccess: () => void;
}

function CreateRestaurantDialog({ request, open, onClose, apiFetch, onSuccess }: CreateRestaurantDialogProps) {
  const [name, setName] = useState(request?.restaurantName ?? "");
  const [slug, setSlug] = useState(request ? toSlug(request.restaurantName) : "");
  const [phone, setPhone] = useState(request?.phone ?? "");
  const [cnpj, setCnpj] = useState(request?.cnpj ?? "");
  const [address, setAddress] = useState(request?.address ?? "");
  const [adminEmail, setAdminEmail] = useState(request?.email ?? "");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !phone || !cnpj || !address || !adminEmail || !adminPassword) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/master/tenants", {
        method: "POST",
        body: JSON.stringify({ name, slug, phone, cnpj, address, adminEmail, adminPassword }),
      });
      toast.success(`Restaurante "${name}" criado com sucesso!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar restaurante.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-primary" />
            Criar Restaurante
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label>Nome do Restaurante *</Label>
              <Input value={name} onChange={e => { setName(e.target.value); setSlug(toSlug(e.target.value)); }} placeholder="Boteco do João" required />
            </div>
            <div className="space-y-1.5">
              <Label>Identificador (slug) *</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm shrink-0">/menu/</span>
                <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="boteco-do-joao" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" required />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ *</Label>
              <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" required />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço *</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua das Flores, 123 — SP" required />
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso do Administrador</p>
            <div className="space-y-1.5">
              <Label>E-mail do admin *</Label>
              <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@restaurante.com" required />
            </div>
            <div className="space-y-1.5">
              <Label>Senha inicial *</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Criando..." : "Criar Restaurante"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MasterAcessos() {
  const { apiFetch } = useMasterAuth();
  const qc = useQueryClient();
  const [createFromRequest, setCreateFromRequest] = useState<RegistrationRequest | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: requests = [], isLoading: loadingRequests } = useQuery<RegistrationRequest[]>({
    queryKey: ["master-registration-requests"],
    queryFn: () => apiFetch<RegistrationRequest[]>("/api/master/registration-requests"),
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const approveRequest = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/master/registration-requests/${id}/approve`, { method: "PATCH" }),
    onSuccess: (_data, id) => {
      const req = requests.find(r => r.id === id) ?? null;
      setCreateFromRequest(req);
      setShowCreateDialog(true);
      qc.invalidateQueries({ queryKey: ["master-registration-requests"] });
    },
    onError: () => toast.error("Erro ao aprovar solicitação."),
  });

  const rejectRequest = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/master/registration-requests/${id}/reject`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Solicitação rejeitada.");
      qc.invalidateQueries({ queryKey: ["master-registration-requests"] });
    },
    onError: () => toast.error("Erro ao rejeitar solicitação."),
  });

  const STATUS_CONFIG = {
    pending: { label: "Pendente", icon: Clock, color: "text-yellow-400", variant: "outline" as const },
    approved: { label: "Aprovado", icon: CheckCircle, color: "text-green-400", variant: "default" as const },
    rejected: { label: "Rejeitado", icon: XCircle, color: "text-red-400", variant: "destructive" as const },
  };

  return (
    <MasterLayout title="Solicitações de Acesso">
      <Tabs defaultValue="solicitacoes">
        <TabsList className="mb-6">
          <TabsTrigger value="solicitacoes" className="gap-2">
            Solicitações
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes">
          <div className="space-y-4">
            {loadingRequests ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma solicitação de acesso recebida.
              </div>
            ) : (
              requests.map(req => {
                const cfg = STATUS_CONFIG[req.status];
                const Icon = cfg.icon;
                return (
                  <Card key={req.id} className={req.status === "pending" ? "border-yellow-500/30" : ""}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{req.name}</span>
                            <Badge variant={cfg.variant} className="gap-1 text-xs">
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">#{req.id}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate font-medium text-foreground">{req.restaurantName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{req.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{req.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Hash className="w-3.5 h-3.5 shrink-0" />
                              <span>CNPJ: {req.cnpj}</span>
                            </div>
                            <div className="flex items-start gap-1.5 text-muted-foreground sm:col-span-2">
                              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{req.address}</span>
                            </div>
                            {req.message && (
                              <div className="flex items-start gap-1.5 text-muted-foreground sm:col-span-2 text-xs italic">
                                <span>"{req.message}"</span>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => approveRequest.mutate(req.id)}
                                disabled={approveRequest.isPending}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Aprovar e Criar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1.5"
                                onClick={() => rejectRequest.mutate(req.id)}
                                disabled={rejectRequest.isPending}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {req.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-green-400 border-green-500/30"
                              onClick={() => { setCreateFromRequest(req); setShowCreateDialog(true); }}
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Criar Restaurante
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CreateRestaurantDialog
        request={createFromRequest}
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        apiFetch={apiFetch}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["master-registration-requests"] })}
      />
    </MasterLayout>
  );
}
