import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout/AppLayout";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Residents } from "@/pages/Residents";
import { Finances } from "@/pages/Finances";
import { Inventory } from "@/pages/Inventory";
import { Activities } from "@/pages/Activities";
import { Vaquinha } from "@/pages/Vaquinha";
import { Reports } from "@/pages/Reports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AuthenticatedApp() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/residentes" component={Residents} />
        <Route path="/financeiro" component={Finances} />
        <Route path="/estoque" component={Inventory} />
        <Route path="/atividades" component={Activities} />
        <Route path="/vaquinha" component={Vaquinha} />
        <Route path="/relatorios" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthenticatedApp />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
