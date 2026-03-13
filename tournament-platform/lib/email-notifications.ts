import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAppBaseUrl, isBrevoConfigured, sendBrevoBroadcastEmail, sendBrevoEmail, type BrevoRecipient } from "@/lib/brevo";

type PlayerRecipient = {
  id: string;
  pseudo: string;
  email: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailFrame(title: string, intro: string, body: string, ctaLabel?: string, ctaHref?: string) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);

  return `
    <html>
      <body style="margin:0;background:#090b16;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f6f0ff;">
        <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#1b1032,#0a0d1d);box-shadow:0 18px 60px rgba(0,0,0,0.35);">
          <div style="padding:28px 28px 12px;border-bottom:1px solid rgba(255,255,255,0.08);background:radial-gradient(circle at top left,rgba(255,181,107,0.18),transparent 38%),radial-gradient(circle at top right,rgba(99,204,255,0.16),transparent 32%);">
            <div style="font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#ffcf99;font-weight:800;">KING League</div>
            <h1 style="margin:14px 0 8px;font-size:30px;line-height:1.05;color:#fff7ea;">${safeTitle}</h1>
            <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.78);">${safeIntro}</p>
          </div>
          <div style="padding:28px;line-height:1.7;font-size:15px;color:rgba(255,255,255,0.88);">${body}
            ${ctaLabel && ctaHref ? `<div style="margin-top:24px;"><a href="${ctaHref}" style="display:inline-block;padding:14px 18px;border-radius:14px;background:linear-gradient(180deg,#ffb96e,#ff7d6a);color:#140d0e;text-decoration:none;font-weight:800;">${escapeHtml(ctaLabel)}</a></div>` : ""}
          </div>
        </div>
      </body>
    </html>
  `;
}

async function markDispatchPending(eventKey: string, type: string, payload?: Record<string, unknown>) {
  const normalizedPayload = payload ? (payload as Prisma.InputJsonValue) : undefined;

  const existing = await prisma.notificationDispatch.findUnique({
    where: { eventKey },
    select: { id: true, status: true },
  });

  if (existing?.status === "SENT") {
    return null;
  }

  if (existing) {
    return prisma.notificationDispatch.update({
      where: { id: existing.id },
      data: {
        type,
        status: "PENDING",
        payload: normalizedPayload,
        lastError: null,
      },
      select: { id: true },
    });
  }

  return prisma.notificationDispatch.create({
    data: {
      eventKey,
      type,
      payload: normalizedPayload,
    },
    select: { id: true },
  });
}

async function runNotificationOnce(eventKey: string, type: string, payload: Record<string, unknown>, task: () => Promise<unknown>) {
  if (!isBrevoConfigured()) {
    console.warn("[notifications] Brevo not configured, skipping", { eventKey, type });
    return false;
  }

  const dispatch = await markDispatchPending(eventKey, type, payload);
  if (!dispatch) {
    return false;
  }

  try {
    await task();
    await prisma.notificationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        lastError: null,
      },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.notificationDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: "FAILED",
        lastError: message,
      },
    });
    throw error;
  }
}

function toRecipient(player: PlayerRecipient | null | undefined): BrevoRecipient | null {
  if (!player?.email) return null;
  return {
    email: player.email,
    name: player.pseudo,
  };
}

async function getBroadcastRecipients() {
  const players = await prisma.player.findMany({
    where: {
      role: "PLAYER",
      email: { not: null },
    },
    select: {
      id: true,
      pseudo: true,
      email: true,
    },
  });

  return players.map((player) => ({
    email: player.email as string,
    name: player.pseudo,
  }));
}

export async function sendPasswordResetEmail(params: { eventKey: string; player: PlayerRecipient; resetUrl: string }) {
  const recipient = toRecipient(params.player);
  if (!recipient) return false;

  return runNotificationOnce(
    params.eventKey,
    "PASSWORD_RESET",
    { playerId: params.player.id, email: params.player.email },
    () => sendBrevoEmail({
      to: [recipient],
      subject: "Réinitialisation de ton mot de passe KING League",
      htmlContent: emailFrame(
        "Mot de passe oublié ?",
        `Un accès de réinitialisation a été demandé pour le compte ${params.player.pseudo}.`,
        `<p>Si tu es bien à l'origine de cette demande, clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
         <p>Ce lien expire dans une heure.</p>
         <p>Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>`,
        "Réinitialiser mon mot de passe",
        params.resetUrl,
      ),
      textContent: `Réinitialise ton mot de passe KING League: ${params.resetUrl}`,
      tags: ["password-reset"],
    }),
  );
}

export async function sendAllianceRequestEmail(params: {
  eventKey: string;
  buyer: PlayerRecipient;
  target: PlayerRecipient;
}) {
  const recipient = toRecipient(params.target);
  if (!recipient) return false;

  const profileUrl = `${getAppBaseUrl()}/profile`;

  return runNotificationOnce(
    params.eventKey,
    "ALLIANCE_REQUEST",
    { buyerId: params.buyer.id, targetId: params.target.id },
    () => sendBrevoEmail({
      to: [recipient],
      subject: `${params.buyer.pseudo} veut t'associer à sa position`,
      htmlContent: emailFrame(
        "Nouvelle demande d'association",
        `${params.buyer.pseudo} t'a recruté pour consolider sa position sur KING League.`,
        `<p>Tu peux confirmer ou refuser cette demande directement depuis ton profil joueur.</p>
         <p>Tant que tu n'as pas répondu, l'association reste en attente.</p>`,
        "Ouvrir mon profil",
        profileUrl,
      ),
      textContent: `${params.buyer.pseudo} t'a envoyé une demande d'association. Réponds depuis ton profil: ${profileUrl}`,
      tags: ["alliance-request"],
    }),
  );
}

export async function sendAllianceDecisionEmail(params: {
  eventKey: string;
  accepted: boolean;
  buyer: PlayerRecipient;
  target: PlayerRecipient;
}) {
  const recipient = toRecipient(params.buyer);
  if (!recipient) return false;

  const profileUrl = `${getAppBaseUrl()}/profile`;
  const subject = params.accepted
    ? `${params.target.pseudo} a accepté ton association`
    : `${params.target.pseudo} a refusé ton association`;

  const intro = params.accepted
    ? `${params.target.pseudo} a confirmé ton achat de joueur.`
    : `${params.target.pseudo} a refusé ton achat de joueur.`;

  const body = params.accepted
    ? `<p>Votre position est maintenant consolidée. Tu peux retrouver l'alliance active dans ton espace joueur.</p>`
    : `<p>Les crédits de recrutement ont été restitués automatiquement sur ton compte.</p>`;

  return runNotificationOnce(
    params.eventKey,
    params.accepted ? "ALLIANCE_ACCEPTED" : "ALLIANCE_REFUSED",
    { buyerId: params.buyer.id, targetId: params.target.id, accepted: params.accepted },
    () => sendBrevoEmail({
      to: [recipient],
      subject,
      htmlContent: emailFrame(
        params.accepted ? "Association confirmée" : "Association refusée",
        intro,
        body,
        "Voir mon profil",
        profileUrl,
      ),
      textContent: `${intro} ${profileUrl}`,
      tags: [params.accepted ? "alliance-accepted" : "alliance-refused"],
    }),
  );
}

export async function sendRoiApprovedEmail(params: {
  eventKey: string;
  roi: PlayerRecipient;
}) {
  const recipients = await getBroadcastRecipients();
  if (!recipients.length) return false;

  const rankingUrl = `${getAppBaseUrl()}/classement`;

  return runNotificationOnce(
    params.eventKey,
    "ROI_APPROVED",
    { roiId: params.roi.id },
    () => sendBrevoBroadcastEmail({
      recipients,
      subject: "Nous avons notre nouveau ROI",
      htmlContent: emailFrame(
        "Nous avons notre nouveau ROI",
        `${params.roi.pseudo} prend officiellement la couronne KING League.`,
        `<p>Le tournoi est lancé et le trône a trouvé son premier souverain.</p>
         <p>Retrouve immédiatement le classement public pour suivre la défense de sa place.</p>`,
        "Voir le classement",
        rankingUrl,
      ),
      textContent: `Nous avons notre nouveau ROI: ${params.roi.pseudo}. Classement: ${rankingUrl}`,
      tags: ["roi-approved"],
    }),
  );
}

export async function sendRoiReplacementEmails(params: {
  dethroned: PlayerRecipient;
  nextRoi: PlayerRecipient;
  dethronedEventKey: string;
  announcementEventKey: string;
}) {
  const rankingUrl = `${getAppBaseUrl()}/classement`;
  const dethronedRecipient = toRecipient(params.dethroned);

  if (dethronedRecipient) {
    await runNotificationOnce(
      params.dethronedEventKey,
      "ROI_DETHRONED",
      { dethronedId: params.dethroned.id, nextRoiId: params.nextRoi.id },
      () => sendBrevoEmail({
        to: [dethronedRecipient],
        subject: "Tu as été déchu du trône KING League",
        htmlContent: emailFrame(
          "Le trône a changé de mains",
          `${params.nextRoi.pseudo} a pris ta place comme ROI.`,
          `<p>Ton règne prend fin, mais la saison continue. Tu peux remonter et reconquérir la première place.</p>`,
          "Consulter le classement",
          rankingUrl,
        ),
        textContent: `${params.nextRoi.pseudo} a pris ta place de ROI. Classement: ${rankingUrl}`,
        tags: ["roi-dethroned"],
      }),
    );
  }

  const recipients = await getBroadcastRecipients();
  if (!recipients.length) return false;

  return runNotificationOnce(
    params.announcementEventKey,
    "ROI_REPLACED",
    { dethronedId: params.dethroned.id, nextRoiId: params.nextRoi.id },
    () => sendBrevoBroadcastEmail({
      recipients,
      subject: "Un nouveau ROI a pris le trône",
      htmlContent: emailFrame(
        "Un nouveau ROI a pris le trône",
        `${params.nextRoi.pseudo} remplace ${params.dethroned.pseudo} au sommet de KING League.`,
        `<p>Le trône vient de basculer. Le classement est à jour et la défense du nouveau ROI commence maintenant.</p>`,
        "Voir le classement",
        rankingUrl,
      ),
      textContent: `${params.nextRoi.pseudo} remplace ${params.dethroned.pseudo} comme ROI. Classement: ${rankingUrl}`,
      tags: ["roi-replaced"],
    }),
  );
}