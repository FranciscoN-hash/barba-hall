import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, User as UserIcon, Scissors, Trash2, Check, X, Pencil,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useBarbers, useCustomers, useServices, useAppointmentsByRange, useUpsertAppointment, useDeleteAppointment, useSetAppointmentStatus } from '@/hooks/useQueries';
import type { Appointment, AppointmentStatus } from '@/types';
import {
  addDays, cn, endOfDay, formatTime, isSameDay, startOfDay, startOfWeek, toISO,
} from '@/lib/utils';

type View = 'day' | 'week';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h - 19h

const statusTone: Record<AppointmentStatus, 'gold' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  scheduled: 'gold',
  confirmed: 'neutral',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'warning',
};
const statusLabel: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Faltou',
};

export function Agenda() {
  const [view, setView] = useState<View>('day');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [prefillHour, setPrefillHour] = useState<number | null>(null);

  const rangeStart = toISO(view === 'day' ? startOfDay(cursor) : startOfWeek(cursor));
  const rangeEnd = toISO(view === 'day' ? endOfDay(cursor) : endOfDay(addDays(startOfWeek(cursor), 6)));

  const { data: appointments = [] } = useAppointmentsByRange(rangeStart, rangeEnd);
  const { data: barbers = [] } = useBarbers();
  const { data: customers = [] } = useCustomers();
  const { data: services = [] } = useServices();
  const upsert = useUpsertAppointment();
  const del = useDeleteAppointment();
  const setStatus = useSetAppointmentStatus();
  const { push } = useToast();

  const days = useMemo(() => {
    if (view === 'day') return [cursor];
    return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
  }, [view, cursor]);

  const apptsByDay = (day: Date) => appointments.filter((a) => isSameDay(new Date(a.start_at), day));

  const openNew = (hour?: number) => {
    setEditing(null);
    setPrefillHour(hour ?? null);
    setModalOpen(true);
  };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setPrefillHour(null);
    setModalOpen(true);
  };

  const shift = (n: number) => setCursor((c) => view === 'day' ? addDays(c, n) : addDays(c, n * 7));

  const label = view === 'day'
    ? cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Gerencie agendamentos com visualização diária e semanal."
        action={
          <Button variant="gold" onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> Novo agendamento
          </Button>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 rounded-lg border border-ink-200 dark:border-ink-700 p-0.5 bg-white dark:bg-ink-900">
          <button
            onClick={() => setView('day')}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === 'day' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950' : 'text-ink-500 hover:text-ink-900 dark:hover:text-white')}
          >Dia</button>
          <button
            onClick={() => setView('week')}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === 'week' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950' : 'text-ink-500 hover:text-ink-900 dark:hover:text-white')}
          >Semana</button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <p className="text-sm font-medium text-ink-700 dark:text-ink-200 capitalize">{label}</p>
      </div>

      {/* Calendar grid */}
      <Card className="overflow-hidden">
        {view === 'week' && (
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-ink-200 dark:border-ink-800">
            <div />
            {days.map((d) => (
              <div key={d.toISOString()} className={cn('p-2 text-center border-l border-ink-200 dark:border-ink-800', isSameDay(d, new Date()) && 'bg-gold-400/10')}>
                <p className="text-[11px] uppercase text-ink-400">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                <p className={cn('text-sm font-semibold', isSameDay(d, new Date()) ? 'text-gold-600 dark:text-gold-400' : 'text-ink-700 dark:text-ink-200')}>{d.getDate()}</p>
              </div>
            ))}
          </div>
        )}
        <div className={cn('grid', view === 'day' ? 'grid-cols-[60px_1fr]' : 'grid-cols-[60px_repeat(7,1fr)]')}>
          {HOURS.map((h) => (
            <div key={h} className="contents">
              <div className="h-16 px-2 py-1 text-right text-xs text-ink-400 border-t border-ink-100 dark:border-ink-800/60">
                {String(h).padStart(2, '0')}:00
              </div>
              {days.map((d) => {
                const slotAppts = apptsByDay(d).filter((a) => new Date(a.start_at).getHours() === h);
                return (
                  <div
                    key={d.toISOString() + h}
                    onClick={() => isSameDay(d, new Date()) || d >= startOfDay(new Date()) ? openNew(h) : undefined}
                    className="h-16 border-t border-l border-ink-100 dark:border-ink-800/60 p-1 overflow-hidden cursor-pointer hover:bg-ink-50/50 dark:hover:bg-ink-800/30 transition-colors"
                  >
                    {slotAppts.map((a) => (
                      <button
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                        className="block w-full text-left rounded-md px-2 py-1 mb-0.5 text-xs truncate bg-gold-100 dark:bg-gold-400/15 text-gold-800 dark:text-gold-200 hover:ring-2 hover:ring-gold-400/40 transition-all"
                      >
                        <span className="font-semibold">{formatTime(a.start_at)}</span> {a.customer?.name ?? 'Avulso'}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* List of today's appts */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {appointments.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Card><EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Nenhum agendamento" description="Clique em um horário para agendar." action={<Button variant="gold" size="sm" onClick={() => openNew()}><Plus className="h-4 w-4" /> Novo</Button>} /></Card>
          </div>
        )}
        {appointments.slice(0, 9).map((a) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 hover:shadow-elevated transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gold-500" />
                  <span className="text-sm font-semibold text-ink-900 dark:text-white">{formatTime(a.start_at)} – {formatTime(a.end_at)}</span>
                </div>
                <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  {a.customer ? <Avatar src={a.customer.avatar_url} name={a.customer.name} size="sm" /> : <div className="h-8 w-8 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center"><UserIcon className="h-4 w-4 text-ink-400" /></div>}
                  <p className="text-sm font-medium text-ink-900 dark:text-white truncate">{a.customer?.name ?? 'Cliente avulso'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                  <Scissors className="h-3.5 w-3.5" /> {a.service?.name ?? '—'} · {a.barber?.name ?? '—'}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">R$ {a.price.toFixed(0)}</span>
                <div className="flex gap-1">
                  {a.status !== 'completed' && (
                    <Button variant="ghost" size="icon" title="Concluir" onClick={() => { setStatus.mutate({ id: a.id, status: 'completed' }); push({ tone: 'success', title: 'Atendimento concluído' }); }}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                  )}
                  {a.status !== 'cancelled' && (
                    <Button variant="ghost" size="icon" title="Cancelar" onClick={() => { setStatus.mutate({ id: a.id, status: 'cancelled' }); push({ tone: 'warning', title: 'Agendamento cancelado' }); }}>
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Excluir" onClick={() => setDeleteId(a.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        barbers={barbers}
        customers={customers}
        services={services}
        prefillHour={prefillHour}
        prefillDate={cursor}
        onSubmit={async (vals) => {
          await upsert.mutateAsync(vals);
          push({ tone: 'success', title: editing ? 'Agendamento atualizado' : 'Agendamento criado' });
          setModalOpen(false);
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          await del.mutateAsync(deleteId);
          push({ tone: 'success', title: 'Agendamento excluído' });
          setDeleteId(null);
        }}
        title="Excluir agendamento?"
        description="O agendamento será removido permanentemente."
        danger
        loading={del.isPending}
      />
    </div>
  );
}

function AppointmentModal({
  open, onClose, editing, barbers, customers, services, prefillHour, prefillDate, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: Appointment | null;
  barbers: ReturnType<typeof useBarbers>['data'];
  customers: ReturnType<typeof useCustomers>['data'];
  services: ReturnType<typeof useServices>['data'];
  prefillHour: number | null;
  prefillDate: Date;
  onSubmit: (vals: Partial<Appointment> & { start_at: string; end_at: string }) => void;
}) {
  const baseDate = editing ? new Date(editing.start_at) : prefillDate;
  const baseHour = editing ? new Date(editing.start_at).getHours() : prefillHour ?? 9;
  const [customerId, setCustomerId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(baseDate.toISOString().slice(0, 10));
  const [time, setTime] = useState(`${String(baseHour).padStart(2, '0')}:00`);
  const [notes, setNotes] = useState('');
  const [status, setStatusV] = useState<AppointmentStatus>('scheduled');

  // re-init when opening
  const key = (editing?.id ?? 'new') + open;

  // reset on open change
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    if (editing) {
      setCustomerId(editing.customer_id ?? '');
      setBarberId(editing.barber_id ?? '');
      setServiceId(editing.service_id ?? '');
      setDate(new Date(editing.start_at).toISOString().slice(0, 10));
      setTime(formatTime(editing.start_at));
      setNotes(editing.notes ?? '');
      setStatusV(editing.status);
    } else {
      setCustomerId(''); setBarberId(''); setServiceId('');
      setDate(prefillDate.toISOString().slice(0, 10));
      setTime(`${String(prefillHour ?? 9).padStart(2, '0')}:00`);
      setNotes(''); setStatusV('scheduled');
    }
  }

  const selectedService = services?.find((s) => s.id === serviceId);
  const price = selectedService?.price ?? editing?.price ?? 0;

  const submit = () => {
    const [h, m] = time.split(':').map(Number);
    const start = new Date(date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (selectedService?.duration_min ?? 30));
    onSubmit({
      id: editing?.id,
      customer_id: customerId || null,
      barber_id: barberId || null,
      service_id: serviceId || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      price,
      notes,
      status,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar agendamento' : 'Novo agendamento'}
      description="Selecione cliente, barbeiro e serviço."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="gold" onClick={submit} loading={false}>{editing ? 'Salvar' : 'Agendar'}</Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Cliente">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Cliente avulso</option>
            {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Barbeiro">
          <Select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            <option value="">Selecionar</option>
            {barbers?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <Field label="Serviço">
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Selecionar</option>
            {services?.map((s) => <option key={s.id} value={s.id}>{s.name} — R$ {s.price}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatusV(e.target.value as AppointmentStatus)}>
            <option value="scheduled">Agendado</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Faltou</option>
          </Select>
        </Field>
        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Horário">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o atendimento..." />
          </Field>
        </div>
        {selectedService && (
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-gold-100/60 dark:bg-gold-400/10 p-3">
            <span className="text-sm text-ink-600 dark:text-ink-300">Duração: {selectedService.duration_min}min</span>
            <span className="text-sm font-semibold text-gold-700 dark:text-gold-300">Valor: R$ {selectedService.price}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
