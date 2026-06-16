export type ExpertSlot = {
  id: string;
  geoCode: string;
  isRemoteFallback: boolean;
  expiresAt: Date;
  startsAt: Date;
  title: string;
  specialization: string;
  contact: string;
  vacanciesUrl?: string | null;
};

export function resolveActiveSlot(slots: ExpertSlot[], visitorGeo: string, now = new Date()) {
  const active = slots.filter((slot) => slot.startsAt <= now && slot.expiresAt > now);
  if (active.length === 0) return null;

  const exact = active.find((slot) => slot.geoCode.toLowerCase() === visitorGeo.toLowerCase());
  if (exact) return exact;

  const remote = active.find((slot) => slot.isRemoteFallback || slot.geoCode.toLowerCase() === "remote");
  if (remote) return remote;

  return active[0];
}
