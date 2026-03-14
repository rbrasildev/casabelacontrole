import { useState } from "react";
import { useListResidents, useCreateResident, useUpdateResident, useDeleteResident, getListResidentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, formatDate } from "@/lib/format";
import { 
  Users, Plus, Search, MoreVertical, Edit, Trash2, ShieldAlert, Phone, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

// Zod schema for form validation based on API schema
const residentSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  cpf: z.string().min(11, "CPF inválido"),
  dateOfBirth: z.string().min(10, "Data necessária"),
  phone: z.string().min(8, "Telefone inválido"),
  emergencyContact: z.string().min(3, "Contato necessário"),
  emergencyPhone: z.string().min(8, "Telefone inválido"),
  entryDate: z.string().min(10, "Data necessária"),
  exitDate: z.string().optional().nullable(),
  status: z.enum(["active", "discharged"]),
  room: z.string().optional().nullable(),
  monthlyFee: z.coerce.number().min(0, "Valor não pode ser negativo"),
  notes: z.string().optional().nullable(),
});

type ResidentFormValues = z.infer<typeof residentSchema>;

export function Residents() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "discharged">("all");
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Queries & Mutations
  const { data: residents, isLoading } = useListResidents({ 
    status: statusFilter === "all" ? undefined : statusFilter, 
    search: search || undefined 
  });

  const createMut = useCreateResident({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResidentsQueryKey() });
        toast({ title: "Sucesso", description: "Residente cadastrado com sucesso." });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro", description: "Falha ao cadastrar residente.", variant: "destructive" })
    }
  });

  const updateMut = useUpdateResident({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResidentsQueryKey() });
        toast({ title: "Sucesso", description: "Residente atualizado." });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Erro", description: "Falha ao atualizar.", variant: "destructive" })
    }
  });

  const deleteMut = useDeleteResident({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResidentsQueryKey() });
        toast({ title: "Sucesso", description: "Residente removido." });
        setIsDeleteOpen(false);
      },
      onError: () => toast({ title: "Erro", description: "Falha ao remover.", variant: "destructive" })
    }
  });

  const form = useForm<ResidentFormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      status: "active",
      monthlyFee: 0,
    }
  });

  const openCreate = () => {
    form.reset({ status: "active", monthlyFee: 0, name: "", cpf: "", dateOfBirth: "", phone: "", emergencyContact: "", emergencyPhone: "", entryDate: "", room: "", notes: "" });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (resident: any) => {
    form.reset({
      name: resident.name,
      cpf: resident.cpf,
      dateOfBirth: resident.dateOfBirth.split('T')[0],
      phone: resident.phone,
      emergencyContact: resident.emergencyContact,
      emergencyPhone: resident.emergencyPhone,
      entryDate: resident.entryDate.split('T')[0],
      exitDate: resident.exitDate ? resident.exitDate.split('T')[0] : null,
      status: resident.status as any,
      room: resident.room,
      monthlyFee: resident.monthlyFee,
      notes: resident.notes,
    });
    setEditingId(resident.id);
    setIsFormOpen(true);
  };

  const onSubmit = (data: ResidentFormValues) => {
    if (editingId) {
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate({ data });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Residentes</h1>
          <p className="text-muted-foreground mt-1">Gerencie os cadastros e informações dos residentes.</p>
        </div>
        <Button 
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-6"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Residente
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Buscar por nome ou CPF..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-background border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-[200px] rounded-xl bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="discharged">Alta/Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">Nome & Contato</th>
                <th className="px-6 py-4">Acomodação</th>
                <th className="px-6 py-4">Status & Entrada</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-10 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-24 rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
                  </tr>
                ))
              ) : residents?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhum residente encontrado</p>
                    <p className="text-sm mt-1">Tente ajustar os filtros ou cadastrar um novo.</p>
                  </td>
                </tr>
              ) : (
                residents?.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{r.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span className="flex items-center"><Phone className="w-3 h-3 mr-1"/> {r.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-lg text-xs font-semibold border border-border">
                        {r.room || 'Não definido'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={r.status === 'active' ? 'default' : 'secondary'} className={r.status === 'active' ? 'bg-primary/10 text-primary hover:bg-primary/20 shadow-none' : ''}>
                          {r.status === 'active' ? 'Ativo' : 'Alta'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Entrada: {formatDate(r.entryDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => navigate(`/residentes/${r.id}`)} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(r)} className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => { setDeletingId(r.id); setIsDeleteOpen(true); }}
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingId ? "Editar Residente" : "Novo Residente"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone Pessoal</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="bg-secondary/30 p-4 rounded-xl space-y-4 border border-border/50">
                <h4 className="font-semibold flex items-center gap-2 text-primary">
                  <ShieldAlert className="w-4 h-4" /> Contato de Emergência
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="emergencyContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Contato</FormLabel>
                      <FormControl><Input {...field} className="bg-background rounded-xl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="emergencyPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone de Emergência</FormLabel>
                      <FormControl><Input {...field} className="bg-background rounded-xl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="entryDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Entrada</FormLabel>
                    <FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="room" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acomodação/Quarto</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="monthlyFee" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensalidade (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="discharged">Alta / Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Médicas/Gerais</FormLabel>
                  <FormControl><textarea {...field} value={field.value || ""} className="w-full min-h-[100px] p-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending} className="rounded-xl bg-primary text-white hover:bg-primary/90">
                  {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar Residente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive font-display">Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este residente? Esta ação não pode ser desfeita e removerá os vínculos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingId && deleteMut.mutate({ id: deletingId })}
              disabled={deleteMut.isPending}
              className="rounded-xl"
            >
              {deleteMut.isPending ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
