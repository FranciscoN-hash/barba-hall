import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User as UserIcon, Palette, Shield, Database, Save, Moon, Sun, Check, ScrollText, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Field, Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLogs, useTeamMembers, useInviteTeamMember, useRevokeTeamMember, useDeleteTeamMember, useCompanySettings, useUpdateCompanySettings, useUploadLogo } from '@/hooks/useQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { UserRole, TeamMemberStatus } from '@/types';

type Section = 'empresa' | 'perfil' | 'tema' | 'permissoes' | 'auditoria' | 'dados';

const SECTIONS: { id: Section; label: string; icon: typeof Building2 }[] = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'perfil', label: 'Perfil', icon: UserIcon },
  { id: 'tema', label: 'Aparência', icon: Palette },
  { id: 'permissoes', label: 'Permissões', icon: Shield },
  { id: 'auditoria', label: 'Auditoria', icon: ScrollText },
  { id: 'dados', label: 'Backup & Dados', icon: Database },
];

const AUDIT_ACTION_LABEL: Record<string, string> = {
  insert: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
};

const AUDIT_ENTITY_LABEL: Record<string, string> = {
  profiles: 'Perfil',
  barbers: 'Barbeiro',
  customers: 'Cliente',
  services: 'Serviço',
  products: 'Produto',
  product_movements: 'Movimentação de estoque',
  appointments: 'Agendamento',
  sales: 'Venda',
  sale_items: 'Item de venda',
  transactions: 'Transação',
  cash_sessions: 'Sessão de caixa',
};

export function Configuracoes() {
  const [section, setSection] = useState<Section>('empresa');
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { push } = useToast();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile?.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); push({ tone: 'success', title: 'Perfil atualizado' }); },
    onError: (e: Error) => push({ tone: 'error', title: 'Erro', description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Gerencie sua conta e preferências do sistema." />

      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        {/* Sidebar nav */}
        <Card className="h-fit p-2">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', section === s.id ? 'bg-ink-100 dark:bg-ink-800 text-ink-900 dark:text-white' : 'text-ink-500 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800/60')}>
              <s.icon className={cn('h-[18px] w-[18px]', section === s.id && 'text-gold-500')} />
              {s.label}
            </button>
          ))}
        </Card>

        {/* Content */}
        <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {section === 'empresa' && <EmpresaSection />}

          {section === 'perfil' && (
            <Card>
              <CardHeader><CardTitle>Meu perfil</CardTitle><CardDescription>Atualize seus dados pessoais.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar src={null} name={fullName || profile?.full_name || 'User'} size="xl" ring />
                  <Button variant="outline" size="sm">Alterar foto</Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Nome completo"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
                  <Field label="E-mail"><Input value={profile ? '' : ''} disabled placeholder={profile?.id ? 'conta logada' : ''} /></Field>
                  <Field label="Função"><Select value={profile?.role ?? 'owner'} disabled><option value="owner">Proprietário</option><option value="manager">Gerente</option><option value="barber">Barbeiro</option><option value="cashier">Caixa</option></Select></Field>
                </div>
                <Button variant="gold" onClick={() => updateProfile.mutate()} loading={updateProfile.isPending}><Save className="h-4 w-4" /> Salvar perfil</Button>
              </CardContent>
            </Card>
          )}

          {section === 'tema' && (
            <Card>
              <CardHeader><CardTitle>Aparência</CardTitle><CardDescription>Escolha o tema do sistema.</CardDescription></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(['light', 'dark'] as const).map((t) => (
                    <button key={t} onClick={() => setTheme(t)} className={cn('flex items-center gap-3 rounded-xl border-2 p-4 transition-all', theme === t ? 'border-gold-400 ring-2 ring-gold-400/30' : 'border-ink-200 dark:border-ink-700 hover:border-ink-300')}>
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', t === 'dark' ? 'bg-ink-900 text-gold-400' : 'bg-ink-100 text-ink-700')}>
                        {t === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-ink-900 dark:text-white">{t === 'dark' ? 'Escuro' : 'Claro'}</p>
                        <p className="text-xs text-ink-400">{t === 'dark' ? 'Modo noturno' : 'Modo diurno'}</p>
                      </div>
                      {theme === t && <Check className="h-5 w-5 text-gold-500" />}
                    </button>
                  ))}
                </div>
                <div className="mt-6">
                  <p className="text-xs font-medium text-ink-500 dark:text-ink-400 mb-2">Cor de destaque</p>
                  <div className="flex gap-2">
                    {['#D4AF37', '#0B0B0B', '#1C1C1C'].map((c) => (
                      <div key={c} className="h-10 w-10 rounded-lg border-2 border-gold-400/40" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {section === 'permissoes' && <PermissoesSection />}

          {section === 'auditoria' && <AuditoriaSection />}

          {section === 'dados' && (
            <Card>
              <CardHeader><CardTitle>Backup & Dados</CardTitle><CardDescription>Gerencie os dados do sistema.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-ink-200 dark:border-ink-700 p-4">
                  <p className="text-sm font-medium text-ink-900 dark:text-white">Exportar dados</p>
                  <p className="text-xs text-ink-400 mt-0.5">Baixe um relatório completo em CSV.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => push({ tone: 'info', title: 'Exportação iniciada' })}><Database className="h-4 w-4" /> Exportar tudo</Button>
                </div>
                <div className="rounded-lg border border-red-200 dark:border-red-900/40 p-4">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Encerrar sessão</p>
                  <p className="text-xs text-ink-400 mt-0.5">Saia da sua conta atual.</p>
                  <Button variant="danger" size="sm" className="mt-3" onClick={signOut}>Sair</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function EmpresaSection() {
  const { profile } = useAuth();
  const { data: settings, isLoading } = useCompanySettings();
  const update = useUpdateCompanySettings();
  const uploadLogo = useUploadLogo();
  const { push } = useToast();
  const canManage = profile?.role === 'owner' || profile?.role === 'manager';

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setForm({ name: settings.name, phone: settings.phone ?? '', email: settings.email ?? '', address: settings.address ?? '' });
    setInitialized(true);
  }

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => push({ tone: 'success', title: 'Dados salvos' }),
      onError: (e: Error) => push({ tone: 'error', title: 'Erro ao salvar', description: e.message }),
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      push({ tone: 'error', title: 'Arquivo muito grande', description: 'Envie uma imagem de até 2MB.' });
      return;
    }
    uploadLogo.mutate(file, {
      onSuccess: () => push({ tone: 'success', title: 'Logo atualizada' }),
      onError: (err: Error) => push({ tone: 'error', title: 'Erro ao enviar logo', description: err.message }),
    });
  };

  if (isLoading) {
    return <Card><CardContent className="pt-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Dados da empresa</CardTitle><CardDescription>Nome e logo aparecem na barra lateral e na tela de login — é a sua marca, não a nossa.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-ink-300 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 overflow-hidden">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-ink-400" />
            )}
          </div>
          {canManage && (
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-2 text-sm font-medium text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800">
                <Upload className="h-4 w-4" />
                {uploadLogo.isPending ? 'Enviando...' : 'Trocar logo'}
              </span>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoChange} disabled={uploadLogo.isPending} />
            </label>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome da barbearia"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canManage} /></Field>
          <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canManage} /></Field>
          <Field label="E-mail"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canManage} /></Field>
          <Field label="Endereço"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!canManage} /></Field>
        </div>

        {canManage ? (
          <Button variant="gold" onClick={handleSave} disabled={update.isPending}>
            <Save className="h-4 w-4" /> Salvar alterações
          </Button>
        ) : (
          <p className="text-xs text-ink-400">Somente o proprietário ou gerente pode alterar os dados da empresa.</p>
        )}
      </CardContent>
    </Card>
  );
}

function PermissoesSection() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Perfis de acesso</CardTitle><CardDescription>O que cada função pode fazer no sistema.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {[
            { role: 'Proprietário', desc: 'Acesso total ao sistema', perms: 'Todas as funções' },
            { role: 'Gerente', desc: 'Gestão operacional e financeira', perms: 'Tudo, exceto convidar/remover equipe' },
            { role: 'Barbeiro', desc: 'Agenda e próprios atendimentos', perms: 'Agenda, clientes e vendas' },
            { role: 'Caixa', desc: 'PDV e caixa', perms: 'Vendas e caixa' },
          ].map((r) => (
            <div key={r.role} className="flex items-center justify-between rounded-lg border border-ink-200 dark:border-ink-700 p-3">
              <div><p className="text-sm font-semibold text-ink-900 dark:text-white">{r.role}</p><p className="text-xs text-ink-400">{r.desc}</p></div>
              <Badge tone="neutral">{r.perms}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {isOwner ? (
        <TeamManagementCard />
      ) : (
        <Card>
          <CardHeader><CardTitle>Sua função</CardTitle><CardDescription>Convites e remoção de equipe são gerenciados pelo proprietário da conta.</CardDescription></CardHeader>
          <CardContent>
            <Badge tone="gold">{profile?.role === 'manager' ? 'Gerente' : profile?.role === 'barber' ? 'Barbeiro' : profile?.role === 'cashier' ? 'Caixa' : profile?.role}</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const ROLE_LABEL: Record<Exclude<UserRole, 'owner'>, string> = {
  manager: 'Gerente',
  barber: 'Barbeiro',
  cashier: 'Caixa',
};

const STATUS_TONE: Record<TeamMemberStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  invited: 'warning',
  revoked: 'neutral',
};

const STATUS_LABEL: Record<TeamMemberStatus, string> = {
  active: 'Ativo',
  invited: 'Convidado',
  revoked: 'Revogado',
};

function TeamManagementCard() {
  const { data: members = [], isLoading } = useTeamMembers();
  const invite = useInviteTeamMember();
  const revoke = useRevokeTeamMember();
  const remove = useDeleteTeamMember();
  const { push } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<UserRole, 'owner'>>('barber');
  const [removeId, setRemoveId] = useState<string | null>(null);

  const handleInvite = () => {
    if (!email.trim()) return;
    invite.mutate(
      { email, role },
      {
        onSuccess: () => {
          push({ tone: 'success', title: 'Convite criado', description: 'A pessoa passa a ter acesso ao cadastrar-se com esse e-mail.' });
          setEmail('');
        },
        onError: (e: Error) => push({ tone: 'error', title: 'Erro ao convidar', description: e.message }),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipe</CardTitle>
        <CardDescription>Convide barbeiros, gerentes ou operadores de caixa para acessar sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <Field label="E-mail do convidado" className="flex-1">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
          </Field>
          <Field label="Função">
            <Select value={role} onChange={(e) => setRole(e.target.value as Exclude<UserRole, 'owner'>)}>
              <option value="manager">Gerente</option>
              <option value="barber">Barbeiro</option>
              <option value="cashier">Caixa</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="gold" onClick={handleInvite} disabled={invite.isPending || !email.trim()}>
              Convidar
            </Button>
          </div>
        </div>

        <p className="text-xs text-ink-400">
          A pessoa convidada precisa se cadastrar no sistema usando exatamente esse e-mail — o acesso à sua conta é vinculado automaticamente no primeiro login.
        </p>

        {isLoading && <Skeleton className="h-24 w-full" />}

        {!isLoading && members.length === 0 && (
          <EmptyState title="Nenhum convite ainda" description="Convide o primeiro membro da sua equipe acima." />
        )}

        {!isLoading && members.length > 0 && (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 dark:border-ink-700 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{m.email}</p>
                  <p className="text-xs text-ink-400">{ROLE_LABEL[m.role]}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                  {m.status !== 'revoked' && (
                    <Button variant="ghost" size="sm" onClick={() => revoke.mutate(m.id)} disabled={revoke.isPending}>
                      Revogar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setRemoveId(m.id)}>
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={() => removeId && remove.mutate(removeId, { onSuccess: () => setRemoveId(null) })}
        title="Remover da equipe"
        description="A pessoa perde o acesso à sua conta imediatamente. Essa ação não pode ser desfeita."
        danger
        loading={remove.isPending}
      />
    </Card>
  );
}

function AuditoriaSection() {
  const { data: logs, isLoading } = useAuditLogs(50);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de auditoria</CardTitle>
        <CardDescription>Últimas 50 alterações registradas automaticamente pelo banco de dados.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {!isLoading && (!logs || logs.length === 0) && (
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title="Nenhum evento registrado ainda"
            description="Toda criação, edição ou exclusão feita no sistema aparece aqui automaticamente."
          />
        )}

        {!isLoading && logs && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-700 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-4 font-medium">Quando</th>
                  <th className="py-2 pr-4 font-medium">Ação</th>
                  <th className="py-2 pr-4 font-medium">Entidade</th>
                  <th className="py-2 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-ink-100 dark:border-ink-800 last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-ink-500 dark:text-ink-400 tabular-nums">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={log.action === 'delete' ? 'danger' : log.action === 'insert' ? 'success' : 'neutral'}>
                        {AUDIT_ACTION_LABEL[log.action] ?? log.action}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-700 dark:text-ink-200">
                      {AUDIT_ENTITY_LABEL[log.entity] ?? log.entity}
                    </td>
                    <td className="py-2.5 text-ink-400 max-w-xs truncate" title={JSON.stringify(log.detail)}>
                      {summarizeAuditDetail(log)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Gera uma linha curta e legível a partir do jsonb salvo pela trigger,
 * em vez de despejar o JSON bruto na tela.
 */
function summarizeAuditDetail(log: { action: string; detail: Record<string, unknown> | null }): string {
  if (!log.detail) return '—';

  const newRow = log.detail.new as Record<string, unknown> | undefined;
  const oldRow = log.detail.old as Record<string, unknown> | undefined;
  const row = newRow ?? oldRow;
  if (!row) return '—';

  const name = (row.name ?? row.full_name ?? row.action ?? row.status) as string | undefined;
  return name ? String(name) : '—';
}
