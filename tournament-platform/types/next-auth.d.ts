import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "ADMIN" | "PLAYER";
      status?: "ROI" | "CHALLENGER" | "PLAYER" | "ELIMINATED";
      gameMode?: "SPAM" | "ONETAP";
      credits?: number;
      logoUrl?: string;
      freefireId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    playerId?: string;
    role?: "ADMIN" | "PLAYER";
    status?: "ROI" | "CHALLENGER" | "PLAYER" | "ELIMINATED";
    gameMode?: "SPAM" | "ONETAP";
    credits?: number;
    logoUrl?: string;
    freefireId?: string;
  }
}
