import { env } from "@/env/server";
import { auth } from "@/lib/auth/auth";
import type { User } from "better-auth";
import { reset } from "drizzle-seed";
import { db } from "../index";
import { user } from "../schema/auth.schema";

import {
  timer,
  timerAction,
  type NewTimer,
  type NewTimerAction,
} from "../schema/timer.schema";
import { weddingEvent, weddingParticipant } from "../schema/wedding-event.schema";

async function seedWeddingData() {
  console.log("🌱 Début du seeding...");
  console.log("🔗 Connexion à la base de données...", env.DATABASE_URL);

  // 1. Créer les utilisateurs
  const usersToCreate: User[] = [
    {
      id: "foo",
      name: "Mathieu",
      email: "admin@neka-tony.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "bar",
      name: "Tony & Neka",
      email: "les-maries@neka-tony.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "qwerty",
      name: "Weeding Planner",
      email: "wedding@neka-tony.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  console.log("⏳ Création des utilisateurs...");
  await Promise.all(
    usersToCreate.map(async (userToCreate) => {
      try {
        const res = await auth.api.signUpEmail({
          body: {
            email: userToCreate.email,
            password: process.env.SEED_USER_PASSWORD!,
            name: userToCreate.name,
          },
        });

        if (res.user) {
          console.log(`✅ Utilisateur créé: ${res.user.email}`);
        }
        return res;
      } catch (error) {
        console.error(
          `❌ Erreur lors de la création de l'utilisateur ${userToCreate.email}:`,
          error,
        );
        throw error;
      }
    }),
  );

  const createdUsers = await db
    .select({
      id: user.id,
    })
    .from(user)
    .orderBy(user.email);

  // 2. Créer l'événement de mariage
  console.log("⏳ Création de l'événement de mariage...");
  const realWeddingEvent = await db
    .insert(weddingEvent)
    .values({
      id: "wedding-event-1",
      name: "Mariage Tony et Neka",
      description: "Célébration du mariage de Tony et Neka",
      eventDate: new Date("2025-10-25T16:00:00.000Z"),
      location: "Recife",
      isDemo: false,
      ownerId: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentTimerId: "timer-1",
    })
    .returning();

  const demoWeddingEvent = await db
    .insert(weddingEvent)
    .values({
      id: "wedding-event-demo",
      name: "DEMO - Mariage Tony et Neka",
      description: "Célébration du mariage de Tony et Neka",
      eventDate: new Date("2025-10-25T16:00:00.000Z"),
      location: "Recife",
      isDemo: true,
      ownerId: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentTimerId: "timer-demo-1",
    })
    .returning();

  console.log("✅ Événement de mariage créé:", realWeddingEvent[0]?.name);
  console.log("✅ Événement DEMO de mariage créé:", demoWeddingEvent[0]?.name);

  // 3. Créer les participants au mariage
  console.log("⏳ Ajout des participants...");
  const realParticipants = await db
    .insert(weddingParticipant)
    .values([
      {
        id: "participant-1",
        weddingEventId: realWeddingEvent[0]?.id,
        userId: createdUsers[0]?.id,
        role: "OWNER",
        joinedAt: new Date(),
      },
      {
        id: "participant-2",
        weddingEventId: realWeddingEvent[0]?.id,
        userId: createdUsers[1]?.id,
        role: "COORDINATOR",
        joinedAt: new Date(),
      },
      {
        id: "participant-3",
        weddingEventId: realWeddingEvent[0]?.id,
        userId: createdUsers[2]?.id,
        role: "COORDINATOR",
        joinedAt: new Date(),
      },
    ])
    .returning();

  console.log("✅ Participants ajoutés:", realParticipants.length);

  const demoParticipants = await db
    .insert(weddingParticipant)
    .values([
      {
        id: "participant-demo-1",
        weddingEventId: demoWeddingEvent[0]?.id,
        userId: createdUsers[0]?.id,
        role: "OWNER",
        joinedAt: new Date(),
      },
      {
        id: "participant-demo-2",
        weddingEventId: demoWeddingEvent[0]?.id,
        userId: createdUsers[1]?.id,
        role: "COORDINATOR",
        joinedAt: new Date(),
      },
      {
        id: "participant-demo-3",
        weddingEventId: demoWeddingEvent[0]?.id,
        userId: createdUsers[2]?.id,
        role: "COORDINATOR",
        joinedAt: new Date(),
      },
    ])
    .returning();

  console.log("✅ Participants DEMO ajoutés:", demoParticipants.length);

  // 4. Créer les 5 timers à partir de 17h, toutes les heures
  const timerData: NewTimer[] = [
    {
      id: "timer-1",
      orderIndex: 2,
      name: "Video + Sound - Landing of the bride and groom",
      scheduledStartTime: new Date("2025-10-25T16:00:00.000Z"), // 16h à Recife (UTC-3)
      durationMinutes: 30,
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-2",
      orderIndex: 1,
      name: "Sound - Landing of the bride and groom",
      scheduledStartTime: new Date("2025-10-25T16:20:00.000Z"),
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-3",
      orderIndex: 3,
      name: "Sound - Photos",
      scheduledStartTime: new Date("2025-10-25T16:40:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-4",
      orderIndex: 4,
      name: "Sound - Speech of best men and maids of honour",
      scheduledStartTime: new Date("2025-10-25T17:05:00.000Z"),
      durationMinutes: 40,
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-5",
      orderIndex: 5,
      name: "Activity - Phone",
      scheduledStartTime: new Date("2025-10-25T17:30:00.000Z"),
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-6",
      orderIndex: 6,
      name: "Surprise",
      status: "PENDING" as const,
      isManual: true,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-7",
      orderIndex: 7,
      name: "Sound - Table-by-table",
      scheduledStartTime: new Date("2025-10-25T18:15:00.000Z"),
      durationMinutes: 45,
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-8",
      orderIndex: 8,
      name: "Activity - Digital game",
      status: "PENDING" as const,
      scheduledStartTime: new Date("2025-10-25T18:30:00.000Z"),
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-9",
      orderIndex: 9,
      name: "Sound - Bouquet toss",
      scheduledStartTime: new Date("2025-10-25T19:00:00.000Z"),
      durationMinutes: 50,
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-10",
      orderIndex: 10,
      name: "Sound - Starting Bouquet toss",
      status: "PENDING" as const,
      isManual: true,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-11",
      orderIndex: 11,
      name: "Sound - Ending Bouquet - Cachaca toss",
      status: "PENDING" as const,
      isManual: true,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-12",
      orderIndex: 12,
      name: "Sound - Starting Cachaca toss",
      status: "PENDING" as const,
      isManual: true,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-13",
      orderIndex: 13,
      name: "Sound - French Shot",
      scheduledStartTime: new Date("2025-10-25T20:15:00.000Z"),
      durationMinutes: 35,
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-14",
      orderIndex: 14,
      name: "Activity - Photomaton",
      scheduledStartTime: new Date("2025-10-25T20:30:00.000Z"),
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-15",
      orderIndex: 15,
      name: "Carnival",
      scheduledStartTime: new Date("2025-10-25T20:50:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-16",
      orderIndex: 16,
      name: "Wedding cake",
      scheduledStartTime: new Date("2025-10-25T21:05:00.000Z"),
      durationMinutes: 55,
      status: "PENDING" as const,
      weddingEventId: realWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const timerDemoData: NewTimer[] = [
    {
      id: "timer-demo-1",
      orderIndex: 2,
      name: "Video + Sound - Landing of the bride and groom",
      scheduledStartTime: new Date("2025-10-25T16:00:00.000Z"), // 16h à Recife (UTC-3)
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-2",
      orderIndex: 1,
      name: "Sound - Landing of the bride and groom",
      scheduledStartTime: new Date("2025-10-25T16:20:00.000Z"),
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-3",
      orderIndex: 3,
      name: "Sound - Photos",
      scheduledStartTime: new Date("2025-10-25T16:40:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-4",
      orderIndex: 4,
      name: "Sound - Speech of best men and maids of honour",
      scheduledStartTime: new Date("2025-10-25T17:05:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-5",
      orderIndex: 5,
      name: "Activity - Phone",
      scheduledStartTime: new Date("2025-10-25T17:30:00.000Z"),
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-6",
      orderIndex: 6,
      name: "Surprise",
      status: "PENDING" as const,
      isManual: true,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-7",
      orderIndex: 7,
      name: "Sound - Table-by-table",
      scheduledStartTime: new Date("2025-10-25T18:15:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-8",
      orderIndex: 8,
      name: "Activity - Digital game",
      status: "PENDING" as const,
      scheduledStartTime: new Date("2025-10-25T18:30:00.000Z"),
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-9",
      orderIndex: 9,
      name: "Sound - Bouquet toss",
      scheduledStartTime: new Date("2025-10-25T19:00:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-10",
      orderIndex: 10,
      name: "Sound - Starting Bouquet toss",
      status: "PENDING" as const,
      isManual: true,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-11",
      orderIndex: 11,
      name: "Sound - Ending Bouquet - Cachaca toss",
      status: "PENDING" as const,
      isManual: true,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-12",
      orderIndex: 12,
      name: "Sound - Starting Cachaca toss",
      status: "PENDING" as const,
      isManual: true,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-13",
      orderIndex: 13,
      name: "Sound - French Shot",
      scheduledStartTime: new Date("2025-10-25T20:15:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-14",
      orderIndex: 14,
      name: "Activity - Photomaton",
      scheduledStartTime: new Date("2025-10-25T20:30:00.000Z"),
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-15",
      orderIndex: 15,
      name: "Carnival",
      scheduledStartTime: new Date("2025-10-25T20:50:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "timer-demo-16",
      orderIndex: 16,
      name: "Wedding cake",
      scheduledStartTime: new Date("2025-10-25T21:05:00.000Z"),
      durationMinutes: 10,
      status: "PENDING" as const,
      weddingEventId: demoWeddingEvent[0]?.id,
      createdById: createdUsers[0]?.id,
      lastModifiedById: createdUsers[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // 5. Créer les actions des timers
  const timerActions: NewTimerAction[] = [
    // Timer 1 action: Video - Entrances of the bride and groom
    {
      id: "asset-timer-1-video-1",
      timerId: "timer-1",
      type: "VIDEO",
      url: "/assets/videos/1-video-demo.mp4",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Atterrissage des mariés",
      contentEn: "Landing of the bride and groom",
      contentBr: "Desembarque dos noivos",
    },
    // Timer 1 action: Sound at the end - Entrances of the bride and groom
    {
      id: "asset-timer-1-sound-1",
      timerId: "timer-1",
      type: "SOUND",
      url: "/assets/sounds/audio-3-entree-des-maries.mp3",
      orderIndex: 1,
      createdAt: new Date(),
      contentFr: "Atterrissage des mariés",
      contentEn: "Landing of the bride and groom",
      contentBr: "Desembarque dos noivos",
      displayDurationSec: 60 * 2, // 2 min
    },

    // Timer 2 action: Sound - Landing of the bride and groom
    {
      id: "asset-timer-2-sound",
      timerId: "timer-2",
      type: "SOUND",
      url: "/assets/sounds/audio-1-atterrissage-tony.mp3",
      contentFr: "Atterrissage des mariés",
      contentEn: "Landing of the bride and groom",
      contentBr: "Desembarque dos noivos",
      orderIndex: 0,
      createdAt: new Date(),
    },

    // Timer 3: Sound - Photos
    {
      id: "asset-timer-3-sound",
      timerId: "timer-3",
      type: "SOUND",
      url: "/assets/sounds/audio-4-photos-neka.mp3",
      contentFr: "Photos",
      contentEn: "Photos",
      contentBr: "Photos",
      orderIndex: 0,
      createdAt: new Date(),
      displayDurationSec: 60 * 2, // 2 min
    },
    // Timer 4: Sound - Speech of best men and maids of honour
    {
      id: "asset-timer-4-sound",
      timerId: "timer-4",
      type: "SOUND",
      url: "/assets/sounds/audio-5-discours-tony.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Discours des témoins",
      contentEn: "Speech of best men and maids of honour",
      contentBr: "Discurso das testemunhas",
      triggerOffsetMinutes: -10,
      displayDurationSec: 60 * 2, // 2 min
    },
    // Timer 5: Activity - Phone
    {
      id: "asset-timer-5-image",
      timerId: "timer-5",
      type: "IMAGE_SOUND",
      orderIndex: 0,
      urls: ["/assets/images/telephone.png", "/assets/sounds/audio-6-telephone.mp3"],
      createdAt: new Date(),
    },

    // Timer 6: Surprise
    {
      id: "asset-timer-6-sound",
      timerId: "timer-6",
      type: "SOUND",
      url: "/assets/sounds/audio-7-ouverture-neka.mp3",
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 7: Sound - Table-by-table
    {
      id: "asset-timer-7-sound",
      timerId: "timer-7",
      type: "SOUND",
      url: "/assets/sounds/audio-9-table.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Activité table par table",
      contentEn: "Table-by-table activity",
      contentBr: "Atividade mesa por mesa",
      triggerOffsetMinutes: -10,
      displayDurationSec: 60 * 2, // 2 min
    },
    // Timer 8: Activity - Digital game
    {
      id: "asset-timer-8-image",
      timerId: "timer-8",
      type: "IMAGE_SOUND",
      urls: ["/assets/images/jeu.png", "/assets/sounds/audio-8-cosmic-love.mp3"],
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 9: Sound - Bouquet toss
    {
      id: "asset-timer-9-sound",
      timerId: "timer-9",
      type: "SOUND",
      url: "/assets/sounds/audio-10-bouquet-tony.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Lancer de bouquet",
      contentEn: "Bouquet toss",
      contentBr: "Jogar o buquê",
      triggerOffsetMinutes: -10,
      displayDurationSec: 60 * 2, // 2 min
    },
    // Timer 10: Sound - Starting Bouquet toss
    {
      id: "asset-timer-10-sound",
      timerId: "timer-10",
      type: "SOUND",
      url: "/assets/sounds/audio-11-countdown.mp3",
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 11: Sound - Ending Bouquet toss
    {
      id: "asset-timer-11-sound",
      timerId: "timer-11",
      type: "SOUND",
      url: "/assets/sounds/audio-12-cachaca-neka.mp3",
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 12: Sound - Starting Cachaca toss
    {
      id: "asset-timer-12-sound",
      timerId: "timer-12",
      type: "SOUND",
      url: "/assets/sounds/audio-13-countdown.mp3",
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 13: Sound - French Shot
    {
      id: "asset-timer-13-sound",
      timerId: "timer-13",
      type: "SOUND",
      url: "/assets/sounds/audio-15-trou-normand-neka.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Trou normand",
      contentEn: "French shot of Normandy",
      contentBr: "Shot francês da Normandia",
      displayDurationSec: 60 * 2, // 2 min
    },
    // Timer 14: Activity - Photomaton
    {
      id: "asset-timer-14-image",
      timerId: "timer-14",
      type: "IMAGE_SOUND",
      urls: ["/assets/images/photomaton.png", "/assets/sounds/audio-14-photomaton.mp3"],
      orderIndex: 0,
      createdAt: new Date(),
    },

    // Timer 15: Carnival
    {
      id: "asset-timer-15-sound",
      timerId: "timer-15",
      type: "SOUND",
      url: "/assets/sounds/audio-16-carnaval.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Carnaval",
      contentEn: "Carnival",
      contentBr: "Carnaval",
      displayDurationSec: 60 * 2, // 2 min
    },
    // Timer 16: Wedding cake
    {
      id: "asset-timer-16-sound",
      timerId: "timer-16",
      type: "SOUND",
      url: "/assets/sounds/audio-17-gateau-tony.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Gâteau de mariage",
      contentEn: "Wedding cake",
      contentBr: "Bolo do casamento",
      displayDurationSec: 60 * 2, // 2 min
    },
  ];
  const timerActionsDemo: NewTimerAction[] = [
    // Timer 1 action: Video - Entrances of the bride and groom
    {
      id: "asset-demo-timer-1-video-1",
      timerId: "timer-demo-1",
      type: "VIDEO",
      url: "/assets/videos/1-video-demo.mp4",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Atterrissage des mariés",
      contentEn: "Landing of the bride and groom",
      contentBr: "Desembarque dos noivos",
    },
    // Timer 1 action: Sound at the end - Entrances of the bride and groom
    {
      id: "asset-demo-timer-1-sound-1",
      timerId: "timer-demo-1",
      type: "SOUND",
      url: "/assets/sounds/audio-3-entree-des-maries.mp3",
      orderIndex: 1,
      createdAt: new Date(),
      contentFr: "Atterrissage des mariés",
      contentEn: "Landing of the bride and groom",
      contentBr: "Desembarque dos noivos",
      displayDurationSec: 15 * 2, // 2 min
    },

    // Timer 2 action: Sound - Landing of the bride and groom
    {
      id: "asset-demo-timer-2-sound",
      timerId: "timer-demo-2",
      type: "SOUND",
      url: "/assets/sounds/audio-1-atterrissage-tony.mp3",
      contentFr: "Atterrissage des mariés",
      contentEn: "Landing of the bride and groom",
      contentBr: "Desembarque dos noivos",
      orderIndex: 0,
      createdAt: new Date(),
    },

    // Timer 3: Sound - Photos
    {
      id: "asset-demo-timer-3-sound",
      timerId: "timer-demo-3",
      type: "SOUND",
      url: "/assets/sounds/audio-4-photos-neka.mp3",
      contentFr: "Photos",
      contentEn: "Photos",
      contentBr: "Photos",
      orderIndex: 0,
      createdAt: new Date(),
      displayDurationSec: 15 * 2, // 2 min
    },
    // Timer 4: Sound - Speech of best men and maids of honour
    {
      id: "asset-demo-timer-4-sound",
      timerId: "timer-demo-4",
      type: "SOUND",
      url: "/assets/sounds/audio-5-discours-tony.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Discours des témoins",
      contentEn: "Speech of best men and maids of honour",
      contentBr: "Discurso das testemunhas",
      triggerOffsetMinutes: -2,
      displayDurationSec: 15 * 2, // 2 min
    },
    // Timer 5: Activity - Phone
    {
      id: "asset-demo-timer-5-image",
      timerId: "timer-demo-5",
      type: "IMAGE_SOUND",
      orderIndex: 0,
      urls: ["/assets/images/telephone.png", "/assets/sounds/audio-6-telephone.mp3"],
      createdAt: new Date(),
    },

    // Timer 6: Surprise
    {
      id: "asset-demo-timer-6-sound",
      timerId: "timer-demo-6",
      type: "SOUND",
      url: "/assets/sounds/audio-7-ouverture-neka.mp3",
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 7: Sound - Table-by-table
    {
      id: "asset-demo-timer-7-sound",
      timerId: "timer-demo-7",
      type: "SOUND",
      url: "/assets/sounds/audio-9-table.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Activité table par table",
      contentEn: "Table-by-table activity",
      contentBr: "Atividade mesa por mesa",
      triggerOffsetMinutes: -2,
      displayDurationSec: 15 * 2, // 2 min
    },
    // Timer 8: Activity - Digital game
    {
      id: "asset-demo-timer-8-image",
      timerId: "timer-demo-8",
      type: "IMAGE_SOUND",
      urls: ["/assets/images/jeu.png", "/assets/sounds/audio-8-cosmic-love.mp3"],
      orderIndex: 0,
      createdAt: new Date(),
    },

    // Timer 9: Sound - Bouquet toss
    {
      id: "asset-demo-timer-9-sound",
      timerId: "timer-demo-9",
      type: "SOUND",
      url: "/assets/sounds/audio-10-bouquet-tony.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Lancer de bouquet",
      contentEn: "Bouquet toss",
      contentBr: "Jogar o buquê",
      triggerOffsetMinutes: -2,
      displayDurationSec: 15 * 2, // 2 min
    },
    // Timer 10: Sound - Starting Bouquet toss
    {
      id: "asset-demo-timer-10-sound",
      timerId: "timer-demo-10",
      type: "SOUND",
      url: "/assets/sounds/audio-11-countdown.mp3",
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 11: Sound - Ending Bouquet toss
    {
      id: "asset-demo-timer-11-sound",
      timerId: "timer-demo-11",
      type: "SOUND",
      url: "/assets/sounds/audio-12-cachaca-neka.mp3",
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 12: Sound - Starting Cachaca toss
    {
      id: "asset-demo-timer-12-sound",
      timerId: "timer-demo-12",
      type: "SOUND",
      url: "/assets/sounds/audio-13-countdown.mp3",
      orderIndex: 0,
      createdAt: new Date(),
    },
    // Timer 13: Sound - French Shot
    {
      id: "asset-demo-timer-13-sound",
      timerId: "timer-demo-13",
      type: "SOUND",
      url: "/assets/sounds/audio-15-trou-normand-neka.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Trou normand",
      contentEn: "French shot of Normandy",
      contentBr: "Shot francês da Normandia",
      displayDurationSec: 15 * 2, // 2 min
    },
    // Timer 14: Activity - Photomaton
    {
      id: "asset-demo-timer-14-image",
      timerId: "timer-demo-14",
      type: "IMAGE_SOUND",
      urls: ["/assets/images/photomaton.png", "/assets/sounds/audio-14-photomaton.mp3"],
      orderIndex: 0,
      createdAt: new Date(),
    },

    // Timer 15: Carnival
    {
      id: "asset-demo-timer-15-sound",
      timerId: "timer-demo-15",
      type: "SOUND",
      url: "/assets/sounds/audio-16-carnaval.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Carnaval",
      contentEn: "Carnival",
      contentBr: "Carnaval",
      displayDurationSec: 15 * 2, // 2 min
    },
    // Timer 16: Wedding cake
    {
      id: "asset-demo-timer-16-sound",
      timerId: "timer-demo-16",
      type: "SOUND",
      url: "/assets/sounds/audio-17-gateau-tony.mp3",
      orderIndex: 0,
      createdAt: new Date(),
      contentFr: "Gâteau de mariage",
      contentEn: "Wedding cake",
      contentBr: "Bolo do casamento",
      displayDurationSec: 15 * 2, // 2 min
    },
  ];

  console.log("⏳ Création des timers...");
  const timers = await db.insert(timer).values(timerData).returning();
  console.log("⏳ Création des timers demo...");
  await db.insert(timer).values(timerDemoData);

  console.log("⏳ Création des assets des timers...");
  await db.insert(timerAction).values(timerActions);
  console.log("⏳ Création des assets des timers demo...");
  await db.insert(timerAction).values(timerActionsDemo);

  console.log("✅ Timers créés:", timers.length);

  console.log("🎉 Seeding terminé avec succès!");

  // Afficher un résumé
  console.log("\n📋 Résumé du seeding:");
  console.log(`- Mariage: ${realWeddingEvent[0]?.name}`);
  console.log(`- Date: ${realWeddingEvent[0]?.eventDate}`);
  console.log("- Propriétaire: Tony et Neka");
  console.log(`- Nombre de timers: ${timers.length}`);
  console.log("\n⏰ Planning des timers:");
  timers.forEach((timer, index) => {
    const startTime = timer.scheduledStartTime
      ? new Date(timer.scheduledStartTime).toISOString()
      : "N/A";
    console.log(
      `${index + 1}. ${startTime} - ${timer.name} (${timer.durationMinutes}min)`,
    );
  });
}

// Fonction principale de seeding
async function main() {
  try {
    await reset(db, { user, weddingParticipant, timer, weddingEvent });
    console.log("✅ Reset de la bas de données avant le seed terminé !");
    await seedWeddingData();
  } catch (error) {
    console.error("❌ Erreur lors du seeding:", error);
    process.exit(1);
  }
}

// Exécuter le seed si ce fichier est lancé directement
if (require.main === module) {
  main();
}

export { seedWeddingData };
