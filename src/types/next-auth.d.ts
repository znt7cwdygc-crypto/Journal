import { AccountMode, ProfileKind, UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      accountMode: AccountMode;
      profileKind: ProfileKind;
      isAdultConfirmed: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: UserRole;
    accountMode?: AccountMode;
    profileKind?: ProfileKind;
    isAdultConfirmed?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    accountMode?: AccountMode;
    profileKind?: ProfileKind;
    isAdultConfirmed?: boolean;
  }
}
