import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useCreateTenant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = {
  name: string;
  slug: string;
  phone: string;
  address: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
};

export default function Cadastro() {
  const [, navigate] = useLocation();
  const createTenant = useCreateTenant();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  function toSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("name", e.target.value);
    setValue("slug", toSlug(e.target.value));
  }

  const onSubmit = async (data: FormData) => {
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
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
        },
      });
      toast.success("Restaurante cadastrado com sucesso! Faça login para continuar.");
      navigate("/login/admin");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : null;
      toast.error(msg ?? "Erro ao cadastrar restaurante. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 dark">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="text-primary font-bold text-xl hover:underline">
            WFoods ComandaFácil
          </Link>
          <h2 className="text-2xl font-bold text-foreground">Cadastrar Restaurante</h2>
          <p className="text-muted-foreground text-sm">
            Crie sua conta e comece a usar agora mesmo
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4 rounded-lg border border-border/40 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dados do Restaurante
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do Restaurante</Label>
              <Input
                id="name"
                placeholder="Ex: Boteco do João"
                {...register("name", { required: "Nome obrigatório" })}
                onChange={onNameChange}
                className="bg-background"
              />
              {errors.name && (
                <p className="text-destructive text-xs">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">
                Identificador (slug){" "}
                <span className="text-muted-foreground font-normal">— usado na URL do cardápio</span>
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">/menu/</span>
                <Input
                  id="slug"
                  placeholder="boteco-do-joao"
                  {...register("slug", {
                    required: "Slug obrigatório",
                    pattern: {
                      value: /^[a-z0-9-]+$/,
                      message: "Apenas letras minúsculas, números e hífens",
                    },
                  })}
                  className="bg-background"
                />
              </div>
              {errors.slug && (
                <p className="text-destructive text-xs">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...register("phone")}
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Endereço <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                id="address"
                placeholder="Rua das Flores, 123 - São Paulo/SP"
                {...register("address")}
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border/40 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conta do Administrador
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="adminEmail">E-mail</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@meurestaurante.com"
                {...register("adminEmail", { required: "E-mail obrigatório" })}
                className="bg-background"
              />
              {errors.adminEmail && (
                <p className="text-destructive text-xs">{errors.adminEmail.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminPassword">Senha</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register("adminPassword", {
                  required: "Senha obrigatória",
                  minLength: { value: 6, message: "Mínimo 6 caracteres" },
                })}
                className="bg-background"
              />
              {errors.adminPassword && (
                <p className="text-destructive text-xs">{errors.adminPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                {...register("confirmPassword", { required: "Confirme a senha" })}
                className="bg-background"
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base bg-primary hover:bg-primary/90"
            disabled={isSubmitting || createTenant.isPending}
          >
            {createTenant.isPending ? "Criando conta..." : "Criar Conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link href="/login/admin" className="text-primary hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
