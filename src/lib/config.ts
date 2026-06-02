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

/** Toggle "Allow event day reality check" (unlock retakes + show prior answers). */
export async function setEventDayMode(value: boolean) {
  return prisma.appConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, eventDayMode: value },
    update: { eventDayMode: value },
  });
}

/** Set the Guided Mode capacity (target). Claimed is derived from enrollments. */
export async function setSeatsTotal(total: number) {
  const seatsTotal = Math.max(0, Math.round(total));
  return prisma.appConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, seatsTotal },
    update: { seatsTotal },
  });
}

/** Set the Solo Mode target. */
export async function setSoloTotal(total: number) {
  const soloTotal = Math.max(0, Math.round(total));
  return prisma.appConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, soloTotal },
    update: { soloTotal },
  });
}
