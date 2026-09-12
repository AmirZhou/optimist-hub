import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const email = (args.profile as { email?: string }).email;
      if (email && !email.endsWith("@optimistii.com")) {
        throw new Error("Only @optimistii.com accounts are allowed");
      }
      if (args.existingUserId) {
        return args.existingUserId;
      }
      return ctx.db.insert("users", {
        email,
        name: (args.profile as { name?: string }).name,
      });
    },
  },
});
