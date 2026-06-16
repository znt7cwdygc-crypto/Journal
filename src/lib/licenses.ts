export function isExpertLicenseActive(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() > now.getTime();
}

export function getExpertLicenseEnd(startDate: Date): Date {
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + 4);
  return end;
}

export function getResumeUnlockEnd(startDate: Date): Date {
  const end = new Date(startDate);
  end.setHours(end.getHours() + 24);
  return end;
}
