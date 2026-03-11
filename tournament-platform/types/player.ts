export type PlayerStatusUi = "ROI" | "Challenger" | "Joueur" | "Éliminé";
export type PlayerGameMode = "SPAM" | "ONETAP";

export type PlayerPublic = {
  id: string;
  pseudo: string;
  freefireId: string;
  countryCode?: string;
  gameMode: PlayerGameMode;
  logoUrl: string;
  credits: number;
  status: "ROI" | "CHALLENGER" | "PLAYER" | "ELIMINATED";
  wins: number;
  losses: number;
  createdAt: string;
  rankingPosition?: number;
  isSeededTop10?: boolean;
  finalRank?: number | null;
};
