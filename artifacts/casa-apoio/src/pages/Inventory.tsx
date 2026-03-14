import { useState } from "react";
import { useListInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, getListInventoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Package, Plus, AlertCircle, Edit, Trash2, Box
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const itemSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  category: z.string().min(2, "Categoria obrigatória"),
  quantity: z.coerce.number().min(0, "Quantidade inválida"),
  unit: z.string().min(1, "Unidade obrigatória"),
  minimumQuantity: z.coerce.number().min(0, "Valor inválido"),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: items, isLoading } = useListInventory();

  const createMut = useCreateInventoryItem({ onSuccess: () => invalidate() });
  const updateMut = useUpdateInventoryItem({ onSuccess: () => invalidate() });
  const deleteMut = useDeleteInventoryItem({ onSuccess: () => invalidate() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
    setIsFormOpen(false);
    toast({ title: "Sucesso", description: "Estoque atualizado." });
  };

  const form = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { quantity: 0, minimumQuantity: 5, unit: "un", category: "Alimentos" }
  });

  const openEdit = (item: any) => {
    form.reset(item);
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingId) updateMut.mutate({ id: editingId, data });
    else createMut.mutate({ data });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Estoque de Suprimentos</h1>
          <p className="text-muted-foreground mt-1">Gerencie alimentos, medicamentos e materiais.</p>
        </div>
        <Button onClick={() => { form.reset(); setEditingId(null); setIsFormOpen(true); }} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
          <Plus className="w-5 h-5 mr-2" /> Adicionar Item
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center items-center text-center">
          <Box className="w-6 h-6 text-primary mb-2" />
          <p className="text-2xl font-bold font-display">{items?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total de Itens</p>
        </div>
        <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/20 shadow-sm flex flex-col justify-center items-center text-center">
          <AlertCircle className="w-6 h-6 text-destructive mb-2" />
          <p className="text-2xl font-bold font-display text-destructive">{items?.filter(i => i.quantity <= i.minimumQuantity).length || 0}</p>
          <p className="text-xs text-destructive/80 font-medium">Alerta de Baixa</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/30 text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Categoria & Local</th>
              <th className="px-6 py-4">Quantidade</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {items?.map((item) => {
              const isLow = item.quantity <= item.minimumQuantity;
              return (
                <tr key={item.id} className={`hover:bg-secondary/20 transition-colors ${isLow ? 'bg-destructive/5' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {isLow && <AlertCircle className="w-4 h-4 text-destructive" />}
                      {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 text-balance max-w-xs">{item.notes}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-secondary px-2 py-1 rounded-md text-xs">{item.category}</span>
                    {item.location && <span className="block text-xs text-muted-foreground mt-1 ml-1">{item.location}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                        {item.quantity}
                      </span>
                      <span className="text-muted-foreground text-xs">{item.unit}</span>
                    </div>
                    {isLow && <Badge variant="destructive" className="mt-1 shadow-none text-[10px] px-1.5 py-0 h-4">Abaixo do mín ({item.minimumQuantity})</Badge>}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate({ id: item.id })} className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome do Produto</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Alimentos">Alimentos</SelectItem>
                        <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                        <SelectItem value="Limpeza">Limpeza / Higiene</SelectItem>
                        <SelectItem value="Materiais">Materiais Gerais</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade (cx, kg, un)</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>Qtd Atual</FormLabel><FormControl><Input type="number" {...field} className="rounded-xl" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="minimumQuantity" render={({ field }) => (
                  <FormItem><FormLabel>Qtd Mínima (Alerta)</FormLabel><FormControl><Input type="number" {...field} className="rounded-xl" /></FormControl></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full rounded-xl bg-primary">Salvar Item</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
