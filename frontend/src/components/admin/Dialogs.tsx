import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { fieldCls } from "@/components/admin/shared";
import { apiPost } from "@/lib/api";
import { errorDetail } from "@/lib/errors";
import type { Me, Restaurant, RestaurantCreate } from "@/lib/types";

export function CreateRestaurantDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (r: Restaurant) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const create = useMutation({
    mutationFn: (body: RestaurantCreate) => apiPost<Restaurant>("/admin/restaurants", body),
    onSuccess: (r) => {
      qc.setQueryData<Restaurant[]>(["restaurants"], (l) => [...(l ?? []), r]);
      toast.success(`${r.name} created`);
      setName("");
      setLocation("");
      onCreated(r);
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't create restaurant")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-restaurant-dialog">
        <DialogHeader>
          <DialogTitle>New restaurant workspace</DialogTitle>
          <DialogDescription>Starts with the default theme. Add owners and a menu next.</DialogDescription>
        </DialogHeader>
        <form id="create-restaurant" onSubmit={(e) => { e.preventDefault(); create.mutate({ name, location }); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nr-name">Name</Label>
            <input id="nr-name" data-testid="create-restaurant-name-input" className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nr-loc">Location</Label>
            <input id="nr-loc" data-testid="create-restaurant-location-input" className={fieldCls} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button form="create-restaurant" type="submit" data-testid="create-restaurant-submit-button" disabled={!name.trim() || create.isPending} className="bg-[#EA580C] hover:bg-[#C2410C]">
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const change = useMutation({
    mutationFn: () => apiPost<Me>("/auth/change-password", { current_password: current, new_password: next }),
    onSuccess: (me) => {
      qc.setQueryData(["me"], me);
      toast.success("Password changed");
      setCurrent("");
      setNext("");
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't change password")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="change-password-dialog">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Other devices will be signed out.</DialogDescription>
        </DialogHeader>
        <form id="change-password" onSubmit={(e) => { e.preventDefault(); change.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cp-cur">Current password</Label>
            <input id="cp-cur" data-testid="current-password-input" type="password" className={fieldCls} value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New password (8+ characters)</Label>
            <input id="cp-new" data-testid="new-password-input" type="password" className={fieldCls} value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />
          </div>
        </form>
        <DialogFooter>
          <Button form="change-password" type="submit" data-testid="change-password-submit-button" disabled={change.isPending} className="bg-[#EA580C] hover:bg-[#C2410C]">
            {change.isPending ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
