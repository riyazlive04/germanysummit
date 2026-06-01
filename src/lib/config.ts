/**
 * Single-row app config (the AppConfig "singleton"). Currently holds the global
 * retake override toggled by the admin from /room/records. Server-only.
 */
import { prisma } from "./db";

const SINGLETON = "singleton";

export async function getAppConfig() {
  return prisma.appConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON },
    update: {},
  });
}

export async function setAllowAllRetakes(value: boolean) {
  return prisma.appConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, allowAllRetakes: value },
    update: { allowAllRetakes: value },
  });
}

/** Set the total seats for the scarcity counter (clamped >= 0). */
export async function setSeatsTotal(total: number) {
  const seatsTotal = Math.max(0, Math.round(total));
  return prisma.appConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, seatsTotal },
    update: { seatsTotal },
  });
}

/** Move the claimed-seat count by a delta (clamped to 0..seatsTotal). */
export async function adjustSeatsClaimed(delta: number) {
  const cfg = await getAppConfig();
  const seatsClaimed = Math.max(0, Math.min(cfg.seatsTotal, cfg.seatsClaimed + delta));
  return prisma.appConfig.update({
    where: { id: SINGLETON },
    data: { seatsClaimed },
  });
}

/** Set the claimed-seat count directly (clamped to 0..seatsTotal). */
export async function setSeatsClaimed(claimed: number) {
  const cfg = await getAppConfig();
  const seatsClaimed = Math.max(0, Math.min(cfg.seatsTotal, Math.round(claimed)));
  return prisma.appConfig.update({
    where: { id: SINGLETON },
    data: { seatsClaimed },
  });
}
