import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      position?: string | null;
      isAdmin?: boolean;
      department?: { id: string; name: string } | null;
      role?: { id: string; name: string; displayName: string } | null;
    };
  }
}
