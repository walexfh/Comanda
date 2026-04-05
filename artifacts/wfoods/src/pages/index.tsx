import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 dark">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">WFoods ComandaFácil</h1>
          <p className="text-muted-foreground text-lg">
            Sistema de gestão para bares e restaurantes
          </p>
        </div>

        <div className="grid gap-4 mt-8">
          <Link href="/login/admin" className="w-full">
            <Button size="lg" className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground">
              Acesso Admin
            </Button>
          </Link>
          <Link href="/login/garcom" className="w-full">
            <Button size="lg" variant="outline" className="w-full text-lg h-14 border-primary/50 hover:bg-primary/10">
              Acesso Garçom
            </Button>
          </Link>
          <div className="border-t border-border/30 pt-4">
            <Link href="/cadastro" className="w-full">
              <Button size="lg" variant="ghost" className="w-full text-base h-12 text-muted-foreground hover:text-primary hover:bg-primary/10">
                + Cadastrar Novo Restaurante
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
