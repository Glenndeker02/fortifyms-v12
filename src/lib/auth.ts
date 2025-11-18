// Mock auth configuration for development
export const authOptions = {
  providers: [],
  callbacks: {
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.millId = token.millId;
      }
      return session;
    },
  },
};
