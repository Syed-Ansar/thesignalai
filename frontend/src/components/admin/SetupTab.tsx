import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel, fieldCls, putRestaurant, useSaveRestaurant } from "@/components/admin/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { errorDetail } from "@/lib/errors";
import type { OwnerOut, Restaurant, RewardConfig } from "@/lib/types";

function DetailsForm({ restaurant }: { restaurant: Restaurant }) {
  const [form, setForm] = useState({
    name: restaurant.name,
    slug: restaurant.slug,
    location: restaurant.location,
    google_place_id: restaurant.google_place_id,
    whatsapp_number: restaurant.whatsapp_number,
    otp_enabled: restaurant.otp_enabled,
    existing_reviews: restaurant.existing_reviews,
    reward: restaurant.reward,
  });
  const setReward = <K extends keyof RewardConfig>(k: K, v: RewardConfig[K]) => setForm((f) => ({ ...f, reward: { ...f.reward, [k]: v } }));
  const save = useSaveRestaurant(restaurant.id, "Restaurant details saved");
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(form);
      }}
      className="space-y-5"
    >
      <Panel title="Restaurant details" description="What guests see, and where their reviews go." testId="details-panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Name</Label>
            <input id="r-name" data-testid="setup-name-input" className={fieldCls} value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-slug">Link slug</Label>
            <input id="r-slug" data-testid="setup-slug-input" className={fieldCls} value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} required />
            <p className="text-[11px] text-[#A8A29E]">/app/{form.slug || "…"}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-loc">Location</Label>
            <input id="r-loc" data-testid="setup-location-input" className={fieldCls} value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-place">Google Place ID</Label>
            <input id="r-place" data-testid="setup-place-id-input" className={fieldCls} value={form.google_place_id} onChange={(e) => set("google_place_id", e.target.value)} placeholder="ChIJ…" />
            <p className="text-[11px] text-[#A8A29E]">Empty = guests land on a Google search for your name.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-wa">WhatsApp Business number</Label>
            <input id="r-wa" data-testid="setup-whatsapp-input" className={fieldCls} value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="+91 98xxxxxxxx" />
          </div>
          <label className="flex items-center gap-3 self-end rounded-lg border border-[#E7E2DA] px-3 py-2.5 text-sm">
            <Checkbox data-testid="setup-otp-checkbox" checked={form.otp_enabled} onCheckedChange={(c: boolean) => set("otp_enabled", c)} />
            <span>
              <span className="font-medium text-[#1C1917]">Phone verification (OTP)</span>
              <span className="block text-[11px] text-[#78716C]">Off = reward unlocks with a phone number, no SMS code</span>
            </span>
          </label>
        </div>
      </Panel>

      <Panel title="Scratch-card reward" description="Every guest who finishes (Google share or private feedback) scratches this after verifying their phone." testId="reward-panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border border-[#E7E2DA] px-3 py-2.5 text-sm sm:col-span-2">
            <Checkbox data-testid="setup-reward-enabled-checkbox" checked={form.reward.enabled} onCheckedChange={(c: boolean) => setReward("enabled", c)} />
            <span>
              <span className="font-medium text-[#1C1917]">Reward is running</span>
              <span className="block text-[11px] text-[#78716C]">Off = the flow ends without a scratch card</span>
            </span>
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="rw-title">Reward for happy guests (4–5★)</Label>
            <input id="rw-title" data-testid="setup-reward-title-input" className={fieldCls} value={form.reward.title} onChange={(e) => setReward("title", e.target.value)} maxLength={80} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rw-sorry">Sorry gift (1–3★)</Label>
            <input id="rw-sorry" data-testid="setup-reward-sorry-input" className={fieldCls} value={form.reward.sorry_title} onChange={(e) => setReward("sorry_title", e.target.value)} maxLength={80} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rw-details">Fine print</Label>
            <input id="rw-details" data-testid="setup-reward-details-input" className={fieldCls} value={form.reward.details} onChange={(e) => setReward("details", e.target.value)} maxLength={240} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rw-days">Valid for (days)</Label>
            <input id="rw-days" data-testid="setup-reward-days-input" type="number" min={1} max={365} className={fieldCls} value={form.reward.valid_days} onChange={(e) => setReward("valid_days", Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
          </div>
        </div>
      </Panel>

      <Panel title="Existing Google reviews" description="Paste your current reviews (one per line or blank-line separated). New drafts over 85% similar get rewritten." testId="existing-reviews-panel">
        <Textarea data-testid="setup-existing-reviews-input" rows={6} value={form.existing_reviews} onChange={(e) => set("existing_reviews", e.target.value)} placeholder="Paste reviews here…" className="text-sm" />
      </Panel>

      <div className="flex justify-end">
        <Button data-testid="setup-save-button" type="submit" disabled={save.isPending} className="h-10 bg-[#EA580C] px-6 hover:bg-[#C2410C]">
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save details"}
        </Button>
      </div>
    </form>
  );
}

function MenuManager({ restaurant }: { restaurant: Restaurant }) {
  const qc = useQueryClient();
  const rid = restaurant.id;
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const onOk = (r: Restaurant) => putRestaurant(qc, r);
  const onErr = (err: unknown) => toast.error(errorDetail(err, "Couldn't update the menu"));
  const add = useMutation({ mutationFn: (n: string) => apiPost<Restaurant>(`/admin/restaurants/${rid}/menu`, { name: n }), onSuccess: (r) => { onOk(r); setName(""); }, onError: onErr });
  const edit = useMutation({ mutationFn: (e: { id: string; name: string }) => apiPatch<Restaurant>(`/admin/restaurants/${rid}/menu/${e.id}`, { name: e.name }), onSuccess: (r) => { onOk(r); setEditing(null); }, onError: onErr });
  const del = useMutation({ mutationFn: (id: string) => apiDelete<Restaurant>(`/admin/restaurants/${rid}/menu/${id}`), onSuccess: onOk, onError: onErr });

  return (
    <Panel title="Signature dishes" description="Shown to guests as tappable chips. Empty menu shows generic defaults." testId="menu-panel">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate(name.trim());
        }}
        className="flex gap-2"
      >
        <input data-testid="menu-add-input" className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken 65" maxLength={60} />
        <Button data-testid="menu-add-button" type="submit" disabled={!name.trim() || add.isPending} className="h-10 gap-1 bg-[#1C1917] hover:bg-[#44403C]">
          <Plus className="size-4" /> Add
        </Button>
      </form>
      <ul className="mt-4 divide-y divide-[#EFEAE1]">
        {restaurant.menu.length === 0 && <li className="py-3 text-sm text-[#A8A29E]">No dishes yet.</li>}
        {restaurant.menu.map((m) => (
          <li key={m.id} data-testid="menu-item" className="flex items-center gap-2 py-2">
            {editing?.id === m.id ? (
              <>
                <input data-testid="menu-edit-input" className={fieldCls} value={editing.name} onChange={(e) => setEditing({ id: m.id, name: e.target.value })} autoFocus />
                <Button size="icon-sm" variant="ghost" data-testid="menu-edit-save-button" disabled={!editing.name.trim()} onClick={() => edit.mutate({ id: m.id, name: editing.name.trim() })}><Check className="size-4" /></Button>
                <Button size="icon-sm" variant="ghost" data-testid="menu-edit-cancel-button" onClick={() => setEditing(null)}><X className="size-4" /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-[#1C1917]">{m.name}</span>
                <Button size="icon-sm" variant="ghost" data-testid="menu-edit-button" aria-label={`Edit ${m.name}`} onClick={() => setEditing({ id: m.id, name: m.name })}><Pencil className="size-3.5" /></Button>
                <Button size="icon-sm" variant="ghost" data-testid="menu-delete-button" aria-label={`Delete ${m.name}`} onClick={() => del.mutate(m.id)} className="text-[#B91C1C] hover:text-[#B91C1C]"><Trash2 className="size-3.5" /></Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function OwnersPanel({ restaurant }: { restaurant: Restaurant }) {
  const qc = useQueryClient();
  const rid = restaurant.id;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const owners = useQuery({ queryKey: ["owners", rid], queryFn: () => apiGet<OwnerOut[]>(`/admin/restaurants/${rid}/owners`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["owners", rid] });
  const add = useMutation({
    mutationFn: () => apiPost<OwnerOut>(`/admin/restaurants/${rid}/owners`, { email, password }),
    onSuccess: () => { refresh(); setEmail(""); setPassword(""); toast.success("Owner login added"); },
    onError: (err) => toast.error(errorDetail(err, "Couldn't add owner")),
  });
  const remove = useMutation({
    mutationFn: (uid: string) => apiDelete(`/admin/restaurants/${rid}/owners/${uid}`),
    onSuccess: () => { refresh(); toast.success("Owner removed"); },
    onError: (err) => toast.error(errorDetail(err, "Couldn't remove owner")),
  });

  return (
    <Panel title="Owner logins" description="Super-admin only. Owners see just the restaurants assigned to them." testId="owners-panel">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input data-testid="owner-email-input" className={fieldCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@email.com" required />
        <input data-testid="owner-password-input" className={fieldCls} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Starting password (8+)" minLength={8} required />
        <Button data-testid="owner-add-button" type="submit" disabled={add.isPending} className="h-10 gap-1 bg-[#1C1917] hover:bg-[#44403C]"><UserPlus className="size-4" /> Add owner</Button>
      </form>
      <ul className="mt-4 divide-y divide-[#EFEAE1]">
        {owners.data?.length === 0 && <li className="py-3 text-sm text-[#A8A29E]">No owners yet.</li>}
        {owners.data?.map((o) => (
          <li key={o.id} data-testid="owner-item" className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-[#1C1917]">{o.email}</span>
            <Button size="sm" variant="ghost" data-testid="owner-remove-button" onClick={() => remove.mutate(o.id)} className="gap-1 text-[#B91C1C] hover:text-[#B91C1C]"><UserMinus className="size-3.5" /> Remove</Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function SetupTab({ restaurant, isSuper }: { restaurant: Restaurant; isSuper: boolean }) {
  return (
    <div className="space-y-5">
      <DetailsForm key={restaurant.id + restaurant.slug} restaurant={restaurant} />
      <MenuManager restaurant={restaurant} />
      {isSuper && <OwnersPanel restaurant={restaurant} />}
    </div>
  );
}
