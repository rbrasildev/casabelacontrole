import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListUsers, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import {
  Users as UsersIcon,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  MoreVertical,
  UserCog,
  Trash2,
  UserCheck,
  UserX,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  staff: "Colaborador",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  staff: "bg-green-100 text-green-700 border-green-200",
  viewer: "bg-gray-100 text-gray-600 border-gray-200",
};

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: ShieldAlert,
  manager: ShieldCheck,
  staff: Shield,
  viewer: Eye,
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useListUsers();

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "Usuário atualizado com sucesso!" });
        setEditUser(null);
      },
      onError: () => {
        toast({ title: "Erro ao atualizar usuário", variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "Usuário removido com sucesso!" });
        setDeleteUserId(null);
      },
      onError: () => {
        toast({ title: "Erro ao remover usuário", variant: "destructive" });
      },
    },
  });

  const filteredUsers = users.filter((u: any) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter((u: any) => u.isActive).length,
    admins: users.filter((u: any) => u.role === "admin").length,
    recent: users.filter((u: any) => {
      const d = new Date(u.createdAt);
      const now = new Date();
      return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  function handleEdit(user: any) {
    setEditUser(user);
    setEditRole(user.role);
  }

  function handleSaveEdit() {
    if (!editUser) return;
    updateMutation.mutate({
      id: editUser.id,
      data: { role: editRole as any },
    });
  }

  function handleToggleActive(user: any) {
    updateMutation.mutate({
      id: user.id,
      data: { isActive: !user.isActive },
    });
  }

  function handleDelete() {
    if (!deleteUserId) return;
    deleteMutation.mutate({ id: deleteUserId });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <UsersIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Registro de Usuários</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie os usuários do sistema e seus níveis de acesso
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Usuários", value: stats.total, icon: UsersIcon, color: "text-primary" },
          { label: "Usuários Ativos", value: stats.active, icon: UserCheck, color: "text-green-600" },
          { label: "Administradores", value: stats.admins, icon: ShieldAlert, color: "text-red-600" },
          { label: "Novos (7 dias)", value: stats.recent, icon: UserCog, color: "text-blue-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-secondary/50`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os usuários que acessaram o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cargos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="staff">Colaborador</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum usuário encontrado</p>
              <p className="text-sm">
                {searchTerm || filterRole !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Usuários aparecerão aqui após fazerem login"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => {
                    const displayName = [user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") || "Sem nome";
                    const initials = displayName
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    const RoleIcon = ROLE_ICONS[user.role] || Eye;

                    return (
                      <TableRow key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                              {user.profileImageUrl && (
                                <AvatarImage src={user.profileImageUrl} alt={displayName} />
                              )}
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.email ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              {user.email}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1.5 font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.viewer}`}
                          >
                            <RoleIcon className="w-3 h-3" />
                            {ROLE_LABELS[user.role] || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                            className={
                              user.isActive
                                ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-100"
                                : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-100"
                            }
                          >
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                <UserCog className="w-4 h-4 mr-2" />
                                Alterar Cargo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                {user.isActive ? (
                                  <>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteUserId(user.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Cargo do Usuário</DialogTitle>
            <DialogDescription>
              Defina o nível de acesso de{" "}
              <span className="font-semibold">
                {editUser
                  ? [editUser.firstName, editUser.lastName].filter(Boolean).join(" ") || "usuário"
                  : ""}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador — Acesso total</SelectItem>
                  <SelectItem value="manager">Gerente — Gerencia módulos</SelectItem>
                  <SelectItem value="staff">Colaborador — Operações diárias</SelectItem>
                  <SelectItem value="viewer">Visualizador — Somente leitura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita e removerá permanentemente o acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
