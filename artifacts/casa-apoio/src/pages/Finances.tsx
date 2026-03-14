import { useState, useMemo, useRef } from "react";
import { useListFinances, useCreateFinance, useUpdateFinance, useDeleteFinance, getListFinancesQueryKey, useListResidents } from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, formatDate } from "@/lib/format";
import { 
  Wallet, Plus, TrendingUp, TrendingDown, MoreVertical, Edit, Trash2, CalendarRange, BarChart3, X,
  Upload, FileText, Download, Loader2, RefreshCw, Repeat, Check, Ban, Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";

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

const recurringSchema = z.object({
  category: z.string().min(2, "Categoria obrigatória"),
  description: z.string().min(3, "Descrição obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor inválido"),
  dayOfMonth: z.coerce.number().min(1).max(31),
  active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

type RecurringFormValues = z.infer<typeof recurringSchema>;

const CATEGORIES = {
  income: ["Mensalidade", "Doação", "Convênio", "Auxílio governamental", "Outros"],
  expense: ["Alimentação", "Medicamentos", "Materiais", "Salários", "Manutenção", "Energia", "Água", "Aluguel", "Outros"]
};

const ALL_CATEGORIES = [...new Set([...CATEGORIES.income, ...CATEGORIES.expense])];

function getFirstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getLastDayOfMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

async function uploadFileToStorage(file: File): Promise<{ objectPath: string }> {
  const res = await fetch(`${BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Erro ao solicitar URL de upload");
  const { uploadURL, objectPath } = await res.json();
  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Erro ao enviar arquivo");
  return { objectPath };
}

interface RecurringExpense {
  id: number;
  category: string;
  description: string;
  amount: number;
  dayOfMonth: number;
  active: boolean;
  notes: string | null;
  createdAt: string;
}

export function Finances() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [editReceiptPath, setEditReceiptPath] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [isRecurringFormOpen, setIsRecurringFormOpen] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState<number | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());

  const { data: allTransactions, isLoading } = useListFinances({ 
    type: typeFilter === "all" ? undefined : typeFilter 
  });
  
  const { data: residents } = useListResidents({ status: "active" });

  const { data: recurringExpenses = [] } = useQuery<RecurringExpense[]>({
    queryKey: ["/api/finances/recurring"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/finances/recurring`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const transactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter((t) => {
      const tDate = t.date.split("T")[0];
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [allTransactions, startDate, endDate, categoryFilter, statusFilter]);

  const totalIncome = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;
  const pendingCount = transactions.filter(t => t.status === 'pending').length;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      if (t.status !== "paid") return;
      if (!map[t.category]) map[t.category] = { income: 0, expense: 0 };
      if (t.type === "income") map[t.category].income += t.amount;
      else map[t.category].expense += t.amount;
    });
    return Object.entries(map)
      .map(([cat, vals]) => ({ category: cat, ...vals, total: vals.income + vals.expense }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const maxCategoryTotal = Math.max(...categoryBreakdown.map(c => c.total), 1);

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

  const generateMut = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const res = await fetch(`${BASE}/api/finances/recurring/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ month, year }),
      });
      if (!res.ok) throw new Error("Erro ao gerar despesas");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getListFinancesQueryKey() });
      toast({ title: "Sucesso", description: data.message });
      setIsGenerateOpen(false);
    },
  });

  const form = useForm<FinanceFormValues>({
    resolver: zodResolver(financeSchema),
    defaultValues: { type: "expense", status: "paid", amount: 0, date: new Date().toISOString().split('T')[0] }
  });

  const recurringForm = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: { dayOfMonth: 1, active: true, amount: 0 }
  });

  const watchType = form.watch("type");

  const openCreate = () => {
    form.reset({ type: "expense", status: "paid", amount: 0, date: new Date().toISOString().split('T')[0], category: "", description: "", paymentMethod: "", notes: "" });
    setEditingId(null);
    setReceiptFile(null);
    setEditReceiptPath(null);
    setIsFormOpen(true);
  };

  const openEdit = (t: any) => {
    form.reset({
      ...t,
      date: t.date.split('T')[0],
      residentId: t.residentId || undefined
    });
    setEditingId(t.id);
    setReceiptFile(null);
    setEditReceiptPath(t.receiptPath || null);
    setIsFormOpen(true);
  };

  const onSubmit = async (data: FinanceFormValues) => {
    let receiptPath = editReceiptPath;

    if (receiptFile) {
      setUploadingReceipt(true);
      try {
        const { objectPath } = await uploadFileToStorage(receiptFile);
        receiptPath = objectPath;
      } catch {
        toast({ title: "Erro ao enviar comprovante", variant: "destructive" });
        setUploadingReceipt(false);
        return;
      }
      setUploadingReceipt(false);
    }

    const payload = { ...data, receiptPath } as any;
    if (editingId) updateMut.mutate({ id: editingId, data: payload });
    else createMut.mutate({ data: payload });
  };

  const openRecurringCreate = () => {
    recurringForm.reset({ dayOfMonth: 1, active: true, amount: 0, category: "", description: "", notes: "" });
    setEditingRecurringId(null);
    setIsRecurringFormOpen(true);
  };

  const openRecurringEdit = (r: RecurringExpense) => {
    recurringForm.reset({ category: r.category, description: r.description, amount: r.amount, dayOfMonth: r.dayOfMonth, active: r.active, notes: r.notes || "" });
    setEditingRecurringId(r.id);
    setIsRecurringFormOpen(true);
  };

  const onRecurringSubmit = async (data: RecurringFormValues) => {
    try {
      const url = editingRecurringId
        ? `${BASE}/api/finances/recurring/${editingRecurringId}`
        : `${BASE}/api/finances/recurring`;
      const res = await fetch(url, {
        method: editingRecurringId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/finances/recurring"] });
      toast({ title: "Sucesso", description: editingRecurringId ? "Despesa fixa atualizada." : "Despesa fixa cadastrada." });
      setIsRecurringFormOpen(false);
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar despesa fixa.", variant: "destructive" });
    }
  };

  const deleteRecurring = async (id: number) => {
    try {
      await fetch(`${BASE}/api/finances/recurring/${id}`, { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["/api/finances/recurring"] });
      toast({ title: "Despesa fixa excluída." });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  function clearFilters() {
    setTypeFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setStartDate(getFirstDayOfMonth());
    setEndDate(getLastDayOfMonth());
  }

  const hasActiveFilters = typeFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || startDate !== getFirstDayOfMonth() || endDate !== getLastDayOfMonth();

  const totalRecurring = recurringExpenses.filter(r => r.active).reduce((acc, r) => acc + r.amount, 0);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Receitas (Pagas)</p>
              <h3 className="text-xl font-bold font-display text-primary">{formatCurrency(totalIncome)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl"><TrendingDown className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Despesas (Pagas)</p>
              <h3 className="text-xl font-bold font-display text-destructive">{formatCurrency(totalExpense)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-primary p-5 rounded-2xl shadow-lg shadow-primary/20 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl"><Wallet className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-medium text-white/80">Saldo no Período</p>
              <h3 className="text-xl font-bold font-display">{formatCurrency(balance)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl"><CalendarRange className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pendentes</p>
              <h3 className="text-xl font-bold font-display">{pendingCount} {pendingCount === 1 ? "transação" : "transações"}</h3>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="rounded-xl">
          <TabsTrigger value="transactions" className="rounded-lg">Transações</TabsTrigger>
          <TabsTrigger value="recurring" className="rounded-lg">Despesas Fixas</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6 mt-4">
          <div className="bg-card p-4 rounded-2xl shadow-sm border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Filtros
              </h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                  <X className="w-3 h-3" /> Limpar filtros
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Período Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl bg-background" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Período Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl bg-background" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
                <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                  <SelectTrigger className="rounded-xl bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="income">Receitas</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="rounded-xl bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {ALL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="rounded-xl bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {categoryBreakdown.length > 0 && (
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Resumo por Categoria (Pagos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryBreakdown.map((item) => (
                    <div key={item.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <div className="flex items-center gap-3">
                          {item.income > 0 && <span className="text-primary text-xs font-semibold">+{formatCurrency(item.income)}</span>}
                          {item.expense > 0 && <span className="text-destructive text-xs font-semibold">-{formatCurrency(item.expense)}</span>}
                        </div>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
                        {item.income > 0 && <div className="bg-primary/70 h-full rounded-l-full transition-all" style={{ width: `${(item.income / maxCategoryTotal) * 100}%` }} />}
                        {item.expense > 0 && <div className="bg-destructive/60 h-full rounded-r-full transition-all" style={{ width: `${(item.expense / maxCategoryTotal) * 100}%` }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border overflow-hidden">
            <div className="px-6 py-3 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-medium">
                {transactions.length} {transactions.length === 1 ? "transação encontrada" : "transações encontradas"}
              </p>
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
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhuma transação encontrada</p>
                        <p className="text-sm mt-1">Ajuste os filtros ou registre uma nova transação.</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-secondary/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {t.type === 'income' ? <TrendingUp className="w-4 h-4 text-primary" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                            {t.description}
                            {(t as any).receiptPath && (
                              <a href={`${BASE}/api/storage${(t as any).receiptPath}`} target="_blank" rel="noopener noreferrer" title="Ver comprovante">
                                <Paperclip className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                              </a>
                            )}
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
                              {(t as any).receiptPath && (
                                <DropdownMenuItem asChild>
                                  <a href={`${BASE}/api/storage${(t as any).receiptPath}`} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4 mr-2" /> Ver Comprovante
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openEdit(t)}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteMut.mutate({ id: t.id })} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6 mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-muted-foreground text-sm">
                Cadastre despesas que se repetem todo mês. Use "Gerar Lançamentos" para criar as transações automaticamente.
              </p>
              {recurringExpenses.filter(r => r.active).length > 0 && (
                <p className="text-sm font-medium mt-1">
                  Total fixo mensal: <span className="text-destructive">{formatCurrency(totalRecurring)}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsGenerateOpen(true)} className="rounded-xl gap-2" disabled={recurringExpenses.filter(r => r.active).length === 0}>
                <RefreshCw className="w-4 h-4" /> Gerar Lançamentos
              </Button>
              <Button onClick={openRecurringCreate} className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Nova Despesa Fixa
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/30 text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Dia do Mês</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recurringExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <Repeat className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhuma despesa fixa cadastrada</p>
                        <p className="text-sm mt-1">Cadastre despesas que se repetem mensalmente.</p>
                      </td>
                    </tr>
                  ) : (
                    recurringExpenses.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/20 transition-colors group">
                        <td className="px-6 py-4 font-semibold">{r.description}</td>
                        <td className="px-6 py-4"><span className="bg-secondary px-2 py-1 rounded-md text-xs">{r.category}</span></td>
                        <td className="px-6 py-4">Dia {r.dayOfMonth}</td>
                        <td className="px-6 py-4 text-right font-bold text-destructive">-{formatCurrency(r.amount)}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={r.active ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary text-muted-foreground"}>
                            {r.active ? <><Check className="w-3 h-3 mr-1" /> Ativa</> : <><Ban className="w-3 h-3 mr-1" /> Inativa</>}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="w-5 h-5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => openRecurringEdit(r)}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteRecurring(r.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); setReceiptFile(null); setEditReceiptPath(null); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl">
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

              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Paperclip className="w-4 h-4" /> Comprovante (Opcional)
                </Label>
                {editReceiptPath && !receiptFile && (
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <FileText className="w-4 h-4 text-primary" />
                    <a href={`${BASE}/api/storage${editReceiptPath}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Ver comprovante atual
                    </a>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditReceiptPath(null)} className="text-destructive text-xs h-6 px-2">
                      Remover
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => receiptInputRef.current?.click()}
                    className="rounded-xl gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {receiptFile ? "Trocar arquivo" : "Selecionar arquivo"}
                  </Button>
                  {receiptFile && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{receiptFile.name}</span>
                  )}
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => { if (e.target.files?.[0]) setReceiptFile(e.target.files[0]); }}
                    className="hidden"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending || uploadingReceipt} className="rounded-xl bg-primary text-white">
                  {uploadingReceipt ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Salvar Transação"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecurringFormOpen} onOpenChange={setIsRecurringFormOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingRecurringId ? "Editar Despesa Fixa" : "Nova Despesa Fixa"}</DialogTitle>
          </DialogHeader>
          <Form {...recurringForm}>
            <form onSubmit={recurringForm.handleSubmit(onRecurringSubmit)} className="space-y-4 py-4">
              <FormField control={recurringForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input {...field} className="rounded-xl" placeholder="Ex: Aluguel, Conta de Luz, Internet..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={recurringForm.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIES.expense.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={recurringForm.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} className="rounded-xl font-bold" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={recurringForm.control} name="dayOfMonth" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia do Vencimento</FormLabel>
                    <FormControl><Input type="number" min={1} max={31} {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={recurringForm.control} name="active" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "true")} defaultValue={String(field.value)}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="true">Ativa</SelectItem>
                        <SelectItem value="false">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <FormField control={recurringForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} className="rounded-xl" placeholder="Observações opcionais..." /></FormControl>
                </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsRecurringFormOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" className="rounded-xl bg-primary text-white">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Gerar Lançamentos do Mês</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Isso vai criar transações (pendentes) para todas as despesas fixas ativas no mês/ano selecionado.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Mês</Label>
                <Select value={String(genMonth)} onValueChange={(v) => setGenMonth(Number(v))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Ano</Label>
                <Input type="number" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))} className="rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={() => generateMut.mutate({ month: genMonth, year: genYear })} disabled={generateMut.isPending} className="rounded-xl">
              {generateMut.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
