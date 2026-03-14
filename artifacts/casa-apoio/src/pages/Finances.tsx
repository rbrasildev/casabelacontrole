import { useState } from "react";
import { useListFinances, useCreateFinance, useUpdateFinance, useDeleteFinance, getListFinancesQueryKey, useListResidents } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, formatDate } from "@/lib/format";
import { 
  Wallet, Plus, TrendingUp, TrendingDown, MoreVertical, Edit, Trash2, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const financeSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(2, "Categoria obrigatória"),
  description: z.string().min(3, "Descrição obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor inválido"),
  date: z.string().min(10, "Data obrigatória"),
  status: z.enum(["paid", "pending", "overdue"]),
  paymentMethod: z.string().optional().nullable(),
  residentId: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FinanceFormValues = z.infer<typeof financeSchema>;

const CATEGORIES = {
  income: ["Mensalidade", "Doação", "Convênio", "Auxílio governamental", "Outros"],
  expense: ["Alimentação", "Medicamentos", "Materiais", "Salários", "Manutenção", "Energia", "Água", "Aluguel", "Outros"]
};

export function Finances() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: transactions, isLoading } = useListFinances({ 
    type: typeFilter === "all" ? undefined : typeFilter 
  });
  
  const { data: residents } = useListResidents({ status: "active" });

  const createMut = useCreateFinance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFinancesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        toast({ title: "Sucesso", description: "Transação registrada." });
        setIsFormOpen(false);
      }
    }
  });

  const updateMut = useUpdateFinance({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFinancesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        setIsFormOpen(false);
      }
    }
  });

  const deleteMut = useDeleteFinance({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFinancesQueryKey() })
    }
  });

  const form = useForm<FinanceFormValues>({
    resolver: zodResolver(financeSchema),
    defaultValues: { type: "expense", status: "paid", amount: 0, date: new Date().toISOString().split('T')[0] }
  });

  const watchType = form.watch("type");

  const openCreate = () => {
    form.reset({ type: "expense", status: "paid", amount: 0, date: new Date().toISOString().split('T')[0], category: "", description: "", paymentMethod: "", notes: "" });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (t: any) => {
    form.reset({
      ...t,
      date: t.date.split('T')[0],
      residentId: t.residentId || undefined
    });
    setEditingId(t.id);
    setIsFormOpen(true);
  };

  const onSubmit = (data: FinanceFormValues) => {
    if (editingId) updateMut.mutate({ id: editingId, data });
    else createMut.mutate({ data });
  };

  // Calculate stats
  const totalIncome = transactions?.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const totalExpense = transactions?.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle de receitas, despesas e mensalidades.</p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl px-6">
          <Plus className="w-5 h-5 mr-2" /> Nova Transação
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receitas (Pagas)</p>
              <h3 className="text-2xl font-bold font-display text-primary">{formatCurrency(totalIncome)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl"><TrendingDown className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Despesas (Pagas)</p>
              <h3 className="text-2xl font-bold font-display text-destructive">{formatCurrency(totalExpense)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-primary p-6 rounded-2xl shadow-lg shadow-primary/20 border border-primary/20 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl"><Wallet className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-white/80">Saldo Operacional</p>
              <h3 className="text-2xl font-bold font-display">{formatCurrency(balance)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-secondary/20 flex gap-4">
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger className="w-[200px] rounded-xl bg-background">
              <SelectValue placeholder="Tipo de Transação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Transações</SelectItem>
              <SelectItem value="income">Apenas Receitas</SelectItem>
              <SelectItem value="expense">Apenas Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {transactions?.map((t) => (
                <tr key={t.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {t.type === 'income' ? <TrendingUp className="w-4 h-4 text-primary" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                      {t.description}
                    </div>
                    {t.residentName && <div className="text-xs text-muted-foreground mt-1">Ref: {t.residentName}</div>}
                  </td>
                  <td className="px-6 py-4"><span className="bg-secondary px-2 py-1 rounded-md text-xs">{t.category}</span></td>
                  <td className="px-6 py-4">{formatDate(t.date)}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={
                      t.status === 'paid' ? 'bg-primary/10 text-primary border-primary/20' :
                      t.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }>
                      {t.status === 'paid' ? 'Pago' : t.status === 'pending' ? 'Pendente' : 'Atrasado'}
                    </Badge>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                    {t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="w-5 h-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => openEdit(t)}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMut.mutate({ id: t.id })} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingId ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="income">Receita (+)</SelectItem>
                        <SelectItem value="expense">Despesa (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIES[watchType].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input {...field} className="rounded-xl" placeholder="Ex: Mensalidade João, Conta de Luz..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} className="rounded-xl font-bold" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="overdue">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              {watchType === 'income' && (
                <FormField control={form.control} name="residentId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vincular a Residente (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione um residente..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none" className="text-muted-foreground italic">Nenhum</SelectItem>
                        {residents?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending} className="rounded-xl bg-primary text-white">
                  Salvar Transação
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
