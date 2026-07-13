const { onSchedule } = require("firebase-functions/v2/scheduler");
import * as admin from "firebase-admin";
import * as webpush from "web-push";

admin.initializeApp();
const db = admin.firestore();

// Interfaces für typsicheren Zugriff auf deine Collections
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UserData {
  pushSubscription?: PushSubscription;
  // Hier kannst du weitere Felder deines Users ergänzen, z.B. name: string;
}

interface GameData {
  date: admin.firestore.Timestamp;
  rsvpDone?: string[]; // Array aus User-IDs
}

// Konfiguriere deine VAPID-Schlüssel
const vapidKeys = {
  publicKey: "BNeYmjizbJTbcUfof5EBOGrKXPzHfcHS5OiCNOYBL7MbTKC83ms4p30qexJ3s24ylnNRHIEzMo9-4xc8-0sfOSg",
  privateKey: "Wcnphotrnxz_IAdOp4nv6XTO1jG0SSIvdN7efaVBD_Q"
};

webpush.setVapidDetails(
  "mailto:deine-email@domain.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Der Cron-Job: Jeden Tag um 09:00 Uhr
export const sendDailyRsvpReminders = onSchedule({
  schedule: "0 9 * * *",
  timeZone: "Europe/Berlin"
}, async (): Promise<void> => {
  
  // 1. Zieldatum berechnen (Heute + 5 Tage)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 5);
  
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  try {
    // 2. Spiele abfragen (mit Typisierung)
    const gamesSnapshot = await db.collection("games")
      .where("date", ">=", startOfDay)
      .where("date", "<=", endOfDay)
      .get() as admin.firestore.QuerySnapshot<GameData>;

    if (gamesSnapshot.empty) {
      console.log("Keine Spiele in 5 Tagen gefunden.");
      return;
    }

    // 3. Alle registrierten Spieler holen (mit Typisierung)
    const usersSnapshot = await db.collection("users").get() as admin.firestore.QuerySnapshot<UserData>;
    
    for (const gameDoc of gamesSnapshot.docs) {
      const gameData = gameDoc.data();
      const rsvpUserIds = gameData.rsvpDone || [];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Bedingung prüfen dank TS ohne Tippfehler bei "pushSubscription"
        if (!rsvpUserIds.includes(userId) && userData.pushSubscription) {
          
          const payload = JSON.stringify({
            title: "Spiel-Erinnerung! ⚽",
            body: `In 5 Tagen steht ein Spiel an. Bitte gib kurz Bescheid, ob du dabei bist!`,
            icon: "/icon-192x192.png" 
          });

          try {
            // Da webpush.sendNotification das Standard-Format erwartet, 
            // casten wir unser Interface zu einem beliebigen Objekt (any)
            await webpush.sendNotification(userData.pushSubscription as any, payload);
            console.log(`Erinnerung erfolgreich gesendet an User: ${userId}`);
          } catch (error: any) {
            // Bereinigung falls Abo abgelaufen (Status 410 oder 404)
            if (error.statusCode === 410 || error.statusCode === 404) {
              console.log(`Abo ungültig für User ${userId}. Wird entfernt.`);
              await db.collection("users").doc(userId).update({
                pushSubscription: admin.firestore.FieldValue.delete()
              });
            } else {
              console.error(`Fehler bei User ${userId}:`, error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Fehler im Cron-Job-Ablauf:", error);
  }
});

/**
 * Scheduled Function zum Löschen alter Match-Chats.
 * Läuft täglich um 04:00 Uhr morgens.
 */
export const cleanupOldMatchChats = onSchedule({
  schedule: "0 4 * * *",
  timeZone: "Europe/Berlin"
}, async (): Promise<void> => {
  const now = new Date().toISOString();
  
  try {
    const expiredCommentsSnapshot = await db.collection("matchComments")
      .where("expiresAt", "<", now)
      .get();
    
    if (expiredCommentsSnapshot.empty) {
      console.log("Keine abgelaufenen Chat-Nachrichten gefunden.");
      return;
    }

    const batch = db.batch();
    expiredCommentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`${expiredCommentsSnapshot.size} alte Chat-Nachrichten gelöscht.`);
  } catch (error) {
    console.error("Fehler beim Bereinigen der Chats:", error);
  }
});
