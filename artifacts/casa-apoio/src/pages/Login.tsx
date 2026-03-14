import { useAuth } from "@workspace/replit-auth-web";
import { Building2, Heart, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Login() {
  const { login, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl border border-border/50">
        {/* Left panel - Branding */}
        <div className="bg-primary p-10 flex flex-col justify-between text-primary-foreground">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-primary-foreground/20 p-2.5 rounded-xl">
                <Building2 className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-none">Casa de Apoio</h1>
                <p className="text-sm text-primary-foreground/70 mt-0.5">Sistema de Gestão</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold leading-tight mb-4">
              Cuidando de quem<br />mais precisa
            </h2>
            <p className="text-primary-foreground/80 text-base leading-relaxed">
              Plataforma completa para gestão de residentes, finanças, estoque e atividades da sua casa de apoio.
            </p>
          </div>

          <div className="space-y-4 mt-10">
            {[
              { icon: Users, text: "Gestão completa de residentes" },
              { icon: Heart, text: "Controle de atividades e cuidados" },
              { icon: Shield, text: "Financeiro e estoque integrados" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="bg-primary-foreground/15 p-1.5 rounded-lg flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm text-primary-foreground/85">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - Login */}
        <div className="bg-card p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-2">Bem-vindo de volta</h3>
            <p className="text-muted-foreground text-sm">
              Faça login para acessar o sistema de gestão.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={login}
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold rounded-xl"
              size="lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Carregando...
                </span>
              ) : (
                "Entrar no Sistema"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-2">
              Acesso restrito a colaboradores autorizados.<br />
              Em caso de problemas, contate o administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
