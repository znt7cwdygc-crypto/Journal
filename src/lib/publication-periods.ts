export const LISTING_PUBLICATION_DAYS = 30;
export const RESUME_PUBLICATION_DAYS = 7;
export const PRODUCT_PUBLICATION_DAYS = 30;

export function daysFromNow(days: number, now = new Date()) {
  return new Date(now.getTime() + 1000 * 60 * 60 * 24 * days);
}

export function listingExpiresAt(now = new Date()) {
  return daysFromNow(LISTING_PUBLICATION_DAYS, now);
}

export function resumeExpiresAt(now = new Date()) {
  return daysFromNow(RESUME_PUBLICATION_DAYS, now);
}

export function productExpiresAt(now = new Date()) {
  return daysFromNow(PRODUCT_PUBLICATION_DAYS, now);
}
