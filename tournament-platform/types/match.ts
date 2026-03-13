export type MatchPublic = {
  id: string;
  status: "PENDING" | "LIVE" | "FINISHED";
  date: string;
  winnerId: string | null;
  sourceType?: "MATCH" | "CHALLENGE";
  challengeStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "FINISHED";
  player1: {
    id: string;
    pseudo: string;
    freefireId: string;
    countryCode?: string;
    logoUrl: string;
  };
  player2: {
    id: string;
    pseudo: string;
    freefireId: string;
    countryCode?: string;
    logoUrl: string;
  };
};
