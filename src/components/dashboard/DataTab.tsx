import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowRightCircle, Star, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDashboard, type Booking, type Opportunity, type Delivery } from "@/lib/dashboard-store";
import { EntryDialog, type EntryFormValue } from "./EntryDialog";
import { OpportunityDialog, type OpportunityFormValue } from "./OpportunityDialog";
import { DeliveryDialog, type DeliveryFormValue } from "./DeliveryDialog";
import { ConvertOpportunityDialog } from "./ConvertOpportunityDialog";
import { fmtDate } from "@/lib/week-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function DataTab() {
  const {
    employees, bookings, opportunities, deliveries,
    addBooking, updateBooking, deleteBooking,
    addOpportunity, updateOpportunity, deleteOpportunity,
    convertOpportunity,
    addOpportunityMember, deleteOpportunityMember,
    addDelivery, updateDelivery, deleteDelivery, convertOpportunityToDelivery,
    canEdit,
  } = useDashboard();

  const [bOpen, setBOpen] = useState(false);
  const [bEdit, setBEdit] = useState<Booking | null>(null);
  const [oOpen, setOOpen] = useState(false);
  const [oEdit, setOEdit] = useState<Opportunity | null>(null);
  const [dOpen, setDOpen] = useState(false);
  const [dEdit, setDEdit] = useState<Delivery | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertOpp, setConvertOpp] = useState<Opportunity | null>(null);
  const [expandedDeliveries, setExpandedDeliveries] = useState<Set<string>>(new Set());
  const toggleDelivery = (id: string) => setExpandedDeliveries(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Deliveries</h2>
            <p className="text-sm text-muted-foreground">Multi-member project bookings.</p>
          </div>
          <Button onClick={() => { setDEdit(null); setDOpen(true); }}>
            <Plus className="size-4 mr-1" /> New delivery
          </Button>
        </div>
        <div className="rounded-lg border bg-card divide-y">
          {deliveries.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No deliveries yet.</div>
          )}
          {deliveries.map(d => {
            const memberBookings = bookings.filter(b => b.deliveryId === d.id);
            const expanded = expandedDeliveries.has(d.id);
            return (
              <div key={d.id}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                  <button onClick={() => toggleDelivery(d.id)} className="text-muted-foreground">
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                  <div className="flex-1">
                    <div className="font-medium">{d.project}</div>
                    <div className="text-sm text-muted-foreground">{d.customer} · {memberBookings.length} member{memberBookings.length !== 1 ? 's' : ''}</div>
                  </div>
                  <Badge variant="outline" className={
                    d.type === 'internal' ? "bg-blue-100 text-blue-800 border-blue-200" :
                    d.type === 'vacation' ? "bg-orange-100 text-orange-800 border-orange-200" :
                    "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }>{d.type}</Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => {
                      setDEdit(d);
                      setDOpen(true);
                    }}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      const err = await deleteDelivery(d.id);
                      err ? toast.error(err) : toast.success('Delivery deleted');
                    }}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                {expanded && memberBookings.length > 0 && (
                  <div className="border-t bg-muted/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-8 py-1.5">Employee</th>
                          <th className="text-right px-4 py-1.5">Workload</th>
                          <th className="text-right px-4 py-1.5">Rate/hr</th>
                          <th className="px-4 py-1.5">Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberBookings.map(b => (
                          <tr key={b.id} className="border-b last:border-0">
                            <td className="px-8 py-1.5 font-medium">{nameOf(b.employeeId)}</td>
                            <td className="px-4 py-1.5 text-right">{b.workload}%</td>
                            <td className="px-4 py-1.5 text-right text-muted-foreground">{b.hourlyRate ?? '—'}</td>
                            <td className="px-4 py-1.5 text-muted-foreground">{fmtDate(b.start)} → {fmtDate(b.end)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Bookings</h2>
            <p className="text-sm text-muted-foreground">Individual (non-delivery) bookings.</p>
          </div>
          <Button onClick={() => { setBEdit(null); setBOpen(true); }}>
            <Plus className="size-4 mr-1" /> New booking
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Workload</TableHead>
                <TableHead className="text-right">Rate/hr</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.filter(b => !b.deliveryId).map((b) => {
                const emp = employees.find((e) => e.id === b.employeeId);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{nameOf(b.employeeId)}</TableCell>
                    <TableCell>{b.customer}</TableCell>
                    <TableCell>{b.project}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        b.type === 'internal' ? "bg-blue-100 text-blue-800 border-blue-200" :
                        b.type === 'vacation' ? "bg-orange-100 text-orange-800 border-orange-200" :
                        "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }>
                        {b.type ?? 'billable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{b.workload}%</TableCell>
                    <TableCell className="text-right text-muted-foreground">{b.hourlyRate ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(b.start)} → {fmtDate(b.end)}</TableCell>
                    <TableCell>
                      {(!emp || canEdit(emp.teamId)) && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setBEdit(b); setBOpen(true); }}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={async () => { const err = await deleteBooking(b.id); err ? toast.error(err) : toast.success("Booking deleted"); }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Opportunities</h2>
            <p className="text-sm text-muted-foreground">Pipeline work. Convert to a booking once it lands.</p>
          </div>
          <Button onClick={() => { setOEdit(null); setOOpen(true); }}>
            <Plus className="size-4 mr-1" /> New opportunity
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Win %</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.customer}</TableCell>
                  <TableCell>{o.project}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {o.members.map(m => {
                        const emp = employees.find(e => e.id === m.employeeId);
                        return (
                          <span key={m.id} className={cn(
                            "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs",
                            m.isCritical ? "text-amber-600 border-amber-300 bg-amber-50" : "text-muted-foreground"
                          )}>
                            {m.isCritical && <Star className="size-3 fill-amber-400 text-amber-400" />}
                            {emp?.name ?? '—'} {m.workload}%
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{o.probability}%</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(o.start)} → {fmtDate(o.end)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Convert to delivery"
                        onClick={() => { setConvertOpp(o); setConvertOpen(true); }}>
                        <ArrowRightCircle className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setOEdit(o); setOOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={async () => { const err = await deleteOpportunity(o.id); err ? toast.error(err) : toast.success("Opportunity deleted"); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <EntryDialog
        open={bOpen}
        onOpenChange={setBOpen}
        title={bEdit ? "Edit booking" : "New booking"}
        employees={employees}
        initial={bEdit ? { employeeId: bEdit.employeeId, customer: bEdit.customer, project: bEdit.project, workload: bEdit.workload, start: bEdit.start, end: bEdit.end, type: bEdit.type, hourlyRate: bEdit.hourlyRate } : undefined}
        onSubmit={async (v: EntryFormValue) => {
          const err = bEdit
            ? await updateBooking({ ...bEdit, ...v, type: v.type ?? 'billable', hourlyRate: v.hourlyRate })
            : await addBooking({ employeeId: v.employeeId, customer: v.customer, project: v.project, workload: v.workload, start: v.start, end: v.end, type: v.type ?? 'billable', hourlyRate: v.hourlyRate });
          err ? toast.error(err) : toast.success(bEdit ? "Booking updated" : "Booking added");
        }}
      />
      <OpportunityDialog
        open={oOpen}
        onOpenChange={setOOpen}
        title={oEdit ? "Edit opportunity" : "New opportunity"}
        employees={employees}
        initial={oEdit ? {
          customer: oEdit.customer, project: oEdit.project,
          probability: oEdit.probability, start: oEdit.start, end: oEdit.end,
          members: oEdit.members.map(m => ({ employeeId: m.employeeId, workload: m.workload, isCritical: m.isCritical }))
        } : undefined}
        onSubmit={async (v: OpportunityFormValue) => {
          if (oEdit) {
            const err = await updateOpportunity({ id: oEdit.id, ...v });
            if (err) { toast.error(err); return; }
            for (const m of oEdit.members) {
              await deleteOpportunityMember(m.id);
            }
            for (const m of v.members) {
              await addOpportunityMember({ opportunityId: oEdit.id, ...m });
            }
            toast.success('Opportunity updated');
          } else {
            const newId = await addOpportunity(v);
            if (!newId) { toast.error('Failed to create opportunity'); return; }
            for (const m of v.members) {
              const err = await addOpportunityMember({ opportunityId: newId, ...m });
              if (err) { toast.error(err); return; }
            }
            toast.success('Opportunity added');
          }
        }}
      />
      <DeliveryDialog
        open={dOpen}
        onOpenChange={setDOpen}
        title={dEdit ? 'Edit delivery' : 'New delivery'}
        employees={employees}
        initial={dEdit ? {
          customer: dEdit.customer, project: dEdit.project, type: dEdit.type,
          members: bookings.filter(b => b.deliveryId === dEdit.id).map(b => ({
            employeeId: b.employeeId, workload: b.workload, start: b.start, end: b.end,
          })),
        } : undefined}
        onSubmit={async (v: DeliveryFormValue) => {
          const err = dEdit
            ? await updateDelivery(dEdit, v.members)
            : await addDelivery(v, v.members);
          err ? toast.error(err) : toast.success(dEdit ? 'Delivery updated' : 'Delivery created');
        }}
      />
      <ConvertOpportunityDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        opportunity={convertOpp}
        employees={employees}
        onSubmit={async (v: DeliveryFormValue) => {
          if (!convertOpp) return;
          const err = await convertOpportunityToDelivery(convertOpp.id, v, v.members);
          err ? toast.error(err) : toast.success('Opportunity converted to delivery');
        }}
      />
    </div>
  );
}
