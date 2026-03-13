import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAppBaseUrl, getBrevoConfigurationStatus, isBrevoConfigured, sendBrevoBroadcastEmail, sendBrevoEmail, type BrevoRecipient } from "@/lib/brevo";
import { formatScheduledMatchDate, getScheduledMatchTimezoneLabel } from "@/lib/match-scheduling";

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
  const safeCtaLabel = ctaLabel ? escapeHtml(ctaLabel) : "";
  const safeCtaHref = ctaHref ? escapeHtml(ctaHref) : "";

  return `
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <style>
          body, table, td, a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }
          img {
            -ms-interpolation-mode: bicubic;
          }
          @media only screen and (max-width: 680px) {
            .tp-shell {
              width: 100% !important;
            }
            .tp-card {
              border-radius: 18px !important;
            }
            .tp-pad {
              padding: 20px !important;
            }
            .tp-title {
              font-size: 26px !important;
              line-height: 1.12 !important;
            }
            .tp-copy {
              font-size: 14px !important;
              line-height: 1.65 !important;
            }
            .tp-button {
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              text-align: center !important;
            }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#090b16;font-family:Arial,Helvetica,sans-serif;color:#f6f0ff;">
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border="0" style="background:#090b16;margin:0;padding:0;width:100%;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="640" cellPadding="0" cellSpacing="0" border="0" class="tp-shell" style="width:100%;max-width:640px;">
                <tr>
                  <td class="tp-card" style="border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#1b1032,#0a0d1d);box-shadow:0 18px 60px rgba(0,0,0,0.35);">
                    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border="0">
                      <tr>
                        <td class="tp-pad" style="padding:28px 28px 12px;border-bottom:1px solid rgba(255,255,255,0.08);background:radial-gradient(circle at top left,rgba(255,181,107,0.18),transparent 38%),radial-gradient(circle at top right,rgba(99,204,255,0.16),transparent 32%);">
                          <div style="font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#ffcf99;font-weight:800;">KING League</div>
                          <h1 class="tp-title" style="margin:14px 0 8px;font-size:30px;line-height:1.05;color:#fff7ea;">${safeTitle}</h1>
                          <p class="tp-copy" style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.78);">${safeIntro}</p>
                        </td>
                      </tr>
                      <tr>
                        <td class="tp-pad tp-copy" style="padding:28px;line-height:1.7;font-size:15px;color:rgba(255,255,255,0.88);">
                          ${body}
                          ${ctaLabel && ctaHref ? `<div style="margin-top:24px;"><a href="${safeCtaHref}" class="tp-button" style="display:inline-block;padding:14px 18px;border-radius:14px;background:linear-gradient(180deg,#ffb96e,#ff7d6a);color:#140d0e;text-decoration:none;font-weight:800;">${safeCtaLabel}</a></div>
                          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.56);">Si le bouton ne s'affiche pas bien sur ton téléphone Android, ton iPhone ou ton ordinateur, ouvre directement ce lien :<br /><a href="${safeCtaHref}" style="color:#8cd9ff;word-break:break-all;">${safeCtaHref}</a></p>` : ""}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
    const configuration = getBrevoConfigurationStatus();
    console.warn("[notifications] Brevo not configured, skipping", {
      eventKey,
      type,
      missing: configuration.missing,
      senderEmail: configuration.senderEmail || null,
      senderName: configuration.senderName,
      apiKeyLooksValid: configuration.apiKeyLooksValid,
    });
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
        "Réinitialise ton mot de passe",
        `Une demande de réinitialisation du mot de passe a été reçue pour le compte ${params.player.pseudo}.`,
        `<p>Si tu es bien à l'origine de cette demande, clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
         <p>Le lien fonctionne sur téléphone Android, iPhone et ordinateur.</p>
         <p>Ce lien expire dans une heure.</p>
         <p>Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>`,
        "Choisir un nouveau mot de passe",
        params.resetUrl,
      ),
      textContent: `Réinitialise ton mot de passe KING League: ${params.resetUrl}`,
      tags: ["password-reset"],
    }),
  );
}

export async function sendSignupWelcomeEmail(params: {
  eventKey: string;
  player: PlayerRecipient;
}) {
  const recipient = toRecipient(params.player);
  if (!recipient) return false;

  const profileUrl = `${getAppBaseUrl()}/profile`;
  const rankingUrl = `${getAppBaseUrl()}/classement`;

  return runNotificationOnce(
    params.eventKey,
    "ACCOUNT_CREATED",
    { playerId: params.player.id, email: params.player.email },
    () => sendBrevoEmail({
      to: [recipient],
      subject: "Bienvenue sur KING League",
      htmlContent: emailFrame(
        "Ton compte est prêt",
        `${params.player.pseudo}, ton inscription KING League est confirmée.`,
        `<p>Ton profil joueur est maintenant créé et prêt pour les défis, les achats de crédits et la course au ROI.</p>
         <p>Tu peux te connecter immédiatement pour accéder à ton espace joueur.</p>
         <p>Le classement public reste disponible à tout moment si tu veux suivre l'arène avant ton premier duel.</p>`,
        "Ouvrir mon profil",
        profileUrl,
      ),
      textContent: `Bienvenue sur KING League ${params.player.pseudo}. Ton compte est créé. Profil: ${profileUrl} Classement: ${rankingUrl}`,
      tags: ["account-created"],
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

export async function sendChallengeCreatedEmails(params: {
  eventKey: string;
  challenger: PlayerRecipient;
  defender: PlayerRecipient;
  scheduledAt: Date;
}) {
  const challengerRecipient = toRecipient(params.challenger);
  const defenderRecipient = toRecipient(params.defender);
  const profileUrl = `${getAppBaseUrl()}/profile`;
  const whenLabel = `${formatScheduledMatchDate(params.scheduledAt)} ${getScheduledMatchTimezoneLabel()}`;

  const tasks: Array<Promise<boolean>> = [];

  if (challengerRecipient) {
    tasks.push(
      runNotificationOnce(
        `${params.eventKey}:challenger`,
        "CHALLENGE_CREATED_CHALLENGER",
        { challengerId: params.challenger.id, defenderId: params.defender.id, scheduledAt: params.scheduledAt.toISOString() },
        () => sendBrevoEmail({
          to: [challengerRecipient],
          subject: `Défi confirmé contre ${params.defender.pseudo}`,
          htmlContent: emailFrame(
            "Ton défi est confirmé",
            `Ton défi contre ${params.defender.pseudo} a bien été enregistré par KING League.`,
            `<p>Le duel est planifié pour le <strong>${escapeHtml(whenLabel)}</strong>.</p>
             <p>Tous les duels ont lieu entre 21h00 et 22h30 GMT, sur des créneaux de 15 minutes.</p>
             <p>Retrouve ce rendez-vous dans ton profil et prépare-toi pour l'affrontement.</p>`,
            "Voir mon profil",
            profileUrl,
          ),
          textContent: `Ton défi contre ${params.defender.pseudo} est confirmé. Date: ${whenLabel}. Profil: ${profileUrl}`,
          tags: ["challenge-created", "challenger-confirmation"],
        }),
      ),
    );
  }

  if (defenderRecipient) {
    tasks.push(
      runNotificationOnce(
        `${params.eventKey}:defender`,
        "CHALLENGE_CREATED_DEFENDER",
        { challengerId: params.challenger.id, defenderId: params.defender.id, scheduledAt: params.scheduledAt.toISOString() },
        () => sendBrevoEmail({
          to: [defenderRecipient],
          subject: `${params.challenger.pseudo} t'a lancé un défi`,
          htmlContent: emailFrame(
            "Nouveau défi reçu",
            `${params.challenger.pseudo} t'a officiellement défié sur KING League.`,
            `<p>Le duel est déjà positionné au <strong>${escapeHtml(whenLabel)}</strong>.</p>
             <p>Tous les duels ont lieu entre 21h00 et 22h30 GMT, sur des créneaux de 15 minutes.</p>
             <p>Consulte ton profil pour suivre l'évolution du défi.</p>`,
            "Voir mon profil",
            profileUrl,
          ),
          textContent: `${params.challenger.pseudo} t'a défié. Date du duel: ${whenLabel}. Profil: ${profileUrl}`,
          tags: ["challenge-created", "defender-notification"],
        }),
      ),
    );
  }

  if (!tasks.length) return false;
  await Promise.all(tasks);
  return true;
}

export async function sendScheduledMatchEmails(params: {
  eventKey: string;
  player1: PlayerRecipient;
  player2: PlayerRecipient;
  scheduledAt: Date;
}) {
  const player1Recipient = toRecipient(params.player1);
  const player2Recipient = toRecipient(params.player2);
  const historyUrl = `${getAppBaseUrl()}/historique`;
  const whenLabel = `${formatScheduledMatchDate(params.scheduledAt)} ${getScheduledMatchTimezoneLabel()}`;

  const recipients = [
    { recipient: player1Recipient, opponent: params.player2, player: params.player1, suffix: "player1" },
    { recipient: player2Recipient, opponent: params.player1, player: params.player2, suffix: "player2" },
  ].filter((entry) => Boolean(entry.recipient));

  if (!recipients.length) return false;

  await Promise.all(
    recipients.map((entry) =>
      runNotificationOnce(
        `${params.eventKey}:${entry.suffix}`,
        "MATCH_SCHEDULED",
        { playerId: entry.player.id, opponentId: entry.opponent.id, scheduledAt: params.scheduledAt.toISOString() },
        () => sendBrevoEmail({
          to: [entry.recipient as BrevoRecipient],
          subject: `Match programmé contre ${entry.opponent.pseudo}`,
          htmlContent: emailFrame(
            "Match officiel programmé",
            `KING League a programmé ton duel contre ${entry.opponent.pseudo}.`,
            `<p>Le match commencera le <strong>${escapeHtml(whenLabel)}</strong>.</p>
             <p>Les programmations officielles KING League respectent les créneaux 21h00 à 22h30 GMT avec des manches de 15 minutes.</p>
             <p>Retrouve cette affiche dans l'historique et prépare ton entrée dans l'arène.</p>`,
            "Voir l'historique",
            historyUrl,
          ),
          textContent: `KING League a programmé ton match contre ${entry.opponent.pseudo}. Date: ${whenLabel}. Historique: ${historyUrl}`,
          tags: ["match-scheduled", "king-league"],
        }),
      ),
    ),
  );

  return true;
}

export async function sendMatchCanceledEmails(params: {
  eventKey: string;
  player1: PlayerRecipient;
  player2: PlayerRecipient;
  scheduledAt: Date;
}) {
  const recipients = [params.player1, params.player2]
    .map((player, index) => ({ player, recipient: toRecipient(player), suffix: index === 0 ? "player1" : "player2" }))
    .filter((entry) => Boolean(entry.recipient));

  if (!recipients.length) return false;

  const historyUrl = `${getAppBaseUrl()}/historique`;
  const whenLabel = `${formatScheduledMatchDate(params.scheduledAt)} ${getScheduledMatchTimezoneLabel()}`;

  await Promise.all(
    recipients.map((entry) =>
      runNotificationOnce(
        `${params.eventKey}:${entry.suffix}`,
        "MATCH_CANCELED",
        { playerId: entry.player.id, scheduledAt: params.scheduledAt.toISOString() },
        () => sendBrevoEmail({
          to: [entry.recipient as BrevoRecipient],
          subject: "Match annulé par KING League",
          htmlContent: emailFrame(
            "Match annulé",
            `Le match officiel prévu le ${whenLabel} a été annulé par l'administration KING League.`,
            `<p>Cette programmation n'est plus active.</p>
             <p>Surveille l'historique pour connaître la prochaine affiche officielle.</p>`,
            "Voir l'historique",
            historyUrl,
          ),
          textContent: `Ton match prévu le ${whenLabel} a été annulé par KING League. Historique: ${historyUrl}`,
          tags: ["match-canceled"],
        }),
      ),
    ),
  );

  return true;
}

export async function sendMatchRescheduledEmails(params: {
  eventKey: string;
  player1: PlayerRecipient;
  player2: PlayerRecipient;
  previousDate: Date;
  nextDate: Date;
}) {
  const recipients = [params.player1, params.player2]
    .map((player, index) => ({ player, recipient: toRecipient(player), suffix: index === 0 ? "player1" : "player2" }))
    .filter((entry) => Boolean(entry.recipient));

  if (!recipients.length) return false;

  const historyUrl = `${getAppBaseUrl()}/historique`;
  const previousLabel = `${formatScheduledMatchDate(params.previousDate)} ${getScheduledMatchTimezoneLabel()}`;
  const nextLabel = `${formatScheduledMatchDate(params.nextDate)} ${getScheduledMatchTimezoneLabel()}`;

  await Promise.all(
    recipients.map((entry) =>
      runNotificationOnce(
        `${params.eventKey}:${entry.suffix}`,
        "MATCH_RESCHEDULED",
        {
          playerId: entry.player.id,
          previousDate: params.previousDate.toISOString(),
          nextDate: params.nextDate.toISOString(),
        },
        () => sendBrevoEmail({
          to: [entry.recipient as BrevoRecipient],
          subject: "Match reporté par KING League",
          htmlContent: emailFrame(
            "Match reporté",
            `Le match KING League a été déplacé vers un nouveau créneau.`,
            `<p>Ancien horaire: <strong>${escapeHtml(previousLabel)}</strong></p>
             <p>Nouveau horaire: <strong>${escapeHtml(nextLabel)}</strong></p>
             <p>Consulte l'historique pour suivre la programmation officielle mise à jour.</p>`,
            "Voir l'historique",
            historyUrl,
          ),
          textContent: `Ton match a été reporté. Ancien horaire: ${previousLabel}. Nouveau horaire: ${nextLabel}. Historique: ${historyUrl}`,
          tags: ["match-rescheduled"],
        }),
      ),
    ),
  );

  return true;
}