import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useCreateTenant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, Mail, Lock, ChevronRight } from "lucide-react";

type Step = "email-check" | "register" | "request" | "request-sent";

type RegisterForm = {
  name: string;
  slug: string;
  phone: string;
  address: string;
  adminPassword: string;
  confirmPassword: string;
};

type RequestForm = {
  requesterName: string;
  restaurantName: string;
  phone: string;
  message: string;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Cadastro() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("email-check");
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [requestSentId, setRequestSentId] = useState<number | null>(null);

  const createTenant = useCreateTenant();

  const registerForm = useForm<RegisterForm>();
  const requestForm = useForm<RequestForm>();

  // ── Step 1: check email ──────────────────────────────────────────────────

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    setCheckLoading(true);
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const res = await fetch(`${base}api/tenants/check-email?email=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setEmail(trimmed);
      if (data.allowed) {
        setStep("register");
      } else {
        setStep("request");
      }
    } catch {
      toast.error("Erro ao verificar e-mail. Tente novamente.");
    } finally {
      setCheckLoading(false);
    }
  };

  // ── Step 2a: register ────────────────────────────────────────────────────

  const onSubmitRegister = async (data: RegisterForm) => {
    if (data.adminPassword !== data.confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    try {
      await createTenant.mutateAsync({
        data: {
          name: data.name,
          slug: data.slug,
          phone: data.phone || null,
          address: data.address || null,
          adminEmail: email,
          adminPassword: data.adminPassword,
        },
      });
      toast.success("Restaurante cadastrado! Faça login para continuar.");
      navigate(`/login/admin?slug=${data.slug}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : null;
      toast.error(msg ?? "Erro ao cadastrar restaurante. Tente novamente.");
    }
  };

  // ── Step 2b: request access ──────────────────────────────────────────────

  const onSubmitRequest = async (data: RequestForm) => {
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const res = await fetch(`${base}api/tenants/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.requesterName,
          email,
          restaurantName: data.restaurantName,
          phone: data.phone || null,
          message: data.message || null,
        }),
      });
      const result = await res.json();

      if (result.alreadyAllowed) {
        setStep("register");
        toast.success("Seu e-mail já está liberado! Prossiga com o cadastro.");
        return;
      }

      setRequestSentId(result.requestId ?? null);
      setStep("request-sent");
    } catch {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 dark">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="text-primary font-bold text-xl hover:underline">
            WFoods ComandaFácil
          </Link>
          <h2 className="text-2xl font-bold text-foreground">Cadastrar Restaurante</h2>
          <p className="text-muted-foreground text-sm">
            {step === "email-check" && "Informe seu e-mail para verificar o acesso"}
            {step === "register" && "Preencha os dados do seu restaurante"}
            {step === "request" && "Solicite acesso ao sistema"}
            {step === "request-sent" && "Solicitação enviada com sucesso"}
          </p>
        </div>

        {/* ── STEP 1: Email check ── */}
        {step === "email-check" && (
          <form onSubmit={handleCheckEmail} className="space-y-4">
            <div className="rounded-lg border border-border/40 bg-card p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-check-input">E-mail do administrador</Label>
                <Input
                  id="email-check-input"
                  type="email"
                  placeholder="admin@meurestaurante.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                  className="bg-background"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Vamos verificar se seu e-mail está autorizado a criar um restaurante.
                </p>
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base"
              disabled={checkLoading || !emailInput.trim()}
            >
              {checkLoading ? "Verificando..." : (
                <span className="flex items-center gap-2">Verificar acesso <ChevronRight className="w-4 h-4" /></span>
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login/admin" className="text-primary hover:underline">Fazer login</Link>
            </p>
          </form>
        )}

        {/* ── STEP 2a: Registration form ── */}
        {step === "register" && (
          <form onSubmit={registerForm.handleSubmit(onSubmitRegister)} className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>E-mail <strong>{email}</strong> autorizado. Preencha os dados abaixo.</span>
            </div>

            <div className="space-y-4 rounded-lg border border-border/40 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados do Restaurante</p>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome do Restaurante</Label>
                <Input
                  id="name"
                  placeholder="Ex: Boteco do João"
                  {...registerForm.register("name", { required: "Nome obrigatório" })}
                  onChange={e => {
                    registerForm.setValue("name", e.target.value);
                    registerForm.setValue("slug", toSlug(e.target.value));
                  }}
                  className="bg-background"
                />
                {registerForm.formState.errors.name && (
                  <p className="text-destructive text-xs">{registerForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">
                  Identificador <span className="text-muted-foreground font-normal">— URL do cardápio</span>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">/menu/</span>
                  <Input
                    id="slug"
                    placeholder="boteco-do-joao"
                    {...registerForm.register("slug", {
                      required: "Slug obrigatório",
                      pattern: { value: /^[a-z0-9-]+$/, message: "Apenas letras minúsculas, números e hífens" },
                    })}
                    className="bg-background"
                  />
                </div>
                {registerForm.formState.errors.slug && (
                  <p className="text-destructive text-xs">{registerForm.formState.errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input id="phone" placeholder="(11) 99999-9999" {...registerForm.register("phone")} className="bg-background" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Endereço <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input id="address" placeholder="Rua das Flores, 123 — SP" {...registerForm.register("address")} className="bg-background" />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border/40 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha do Administrador</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />{email}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminPassword">Senha</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  {...registerForm.register("adminPassword", {
                    required: "Senha obrigatória",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" },
                  })}
                  className="bg-background"
                />
                {registerForm.formState.errors.adminPassword && (
                  <p className="text-destructive text-xs">{registerForm.formState.errors.adminPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite a senha novamente"
                  {...registerForm.register("confirmPassword", { required: "Confirme a senha" })}
                  className="bg-background"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base bg-primary hover:bg-primary/90"
              disabled={createTenant.isPending}
            >
              {createTenant.isPending ? "Criando conta..." : "Criar Conta"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("email-check")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Usar outro e-mail
            </button>
          </form>
        )}

        {/* ── STEP 2b: Request access form ── */}
        {step === "request" && (
          <form onSubmit={requestForm.handleSubmit(onSubmitRequest)} className="space-y-4">
            <div className="flex items-start gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm">
              <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="text-orange-300 space-y-1">
                <p className="font-semibold">E-mail não autorizado</p>
                <p className="text-orange-400/80">
                  O e-mail <strong className="text-orange-300">{email}</strong> ainda não tem acesso liberado.
                  Envie uma solicitação e entraremos em contato.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border/40 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados da Solicitação</p>

              <div className="space-y-1.5">
                <Label htmlFor="requesterName">Seu nome</Label>
                <Input
                  id="requesterName"
                  placeholder="João Silva"
                  {...requestForm.register("requesterName", { required: "Nome obrigatório" })}
                  className="bg-background"
                />
                {requestForm.formState.errors.requesterName && (
                  <p className="text-destructive text-xs">{requestForm.formState.errors.requesterName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="restaurantName">Nome do Restaurante</Label>
                <Input
                  id="restaurantName"
                  placeholder="Boteco do João"
                  {...requestForm.register("restaurantName", { required: "Nome do restaurante obrigatório" })}
                  className="bg-background"
                />
                {requestForm.formState.errors.restaurantName && (
                  <p className="text-destructive text-xs">{requestForm.formState.errors.restaurantName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="requestPhone">WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  id="requestPhone"
                  placeholder="(11) 99999-9999"
                  {...requestForm.register("phone")}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Mensagem <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <textarea
                  id="message"
                  {...requestForm.register("message")}
                  placeholder="Conte um pouco sobre seu estabelecimento..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base"
              disabled={requestForm.formState.isSubmitting}
            >
              {requestForm.formState.isSubmitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("email-check")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Usar outro e-mail
            </button>
          </form>
        )}

        {/* ── STEP 3: Request sent ── */}
        {step === "request-sent" && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                <Clock className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">Solicitação Enviada!</h3>
              <p className="text-muted-foreground text-sm">
                Sua solicitação foi registrada com sucesso
                {requestSentId ? ` (#${requestSentId})` : ""}.
              </p>
              <p className="text-muted-foreground text-sm">
                Você será notificado no e-mail <strong className="text-foreground">{email}</strong> assim que o acesso for liberado.
              </p>
            </div>
            <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
              Normalmente respondemos em até 1 dia útil.
            </div>
            <button
              type="button"
              onClick={() => { setStep("email-check"); setEmailInput(""); setEmail(""); }}
              className="text-sm text-primary hover:underline"
            >
              Tentar outro e-mail
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
