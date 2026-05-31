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
