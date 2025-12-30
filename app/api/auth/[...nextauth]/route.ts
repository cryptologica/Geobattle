import NextAuth, { NextAuthOptions } from 'next-auth';
import TwitchProvider from 'next-auth/providers/twitch';
import { getServiceSupabase } from '@/lib/supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

      try {
        const supabase = getServiceSupabase();
        
        // Upsert user to Supabase
        const { error } = await supabase
          .from('users')
          .upsert({
            provider: account.provider,
            provider_id: account.providerAccountId,
            email: user.email || null,
            name: user.name || null,
            image: user.image || null,
          }, {
            onConflict: 'provider,provider_id',
          });

        if (error) {
          console.error('Error syncing user to Supabase:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token.sub) {
        try {
          const supabase = getServiceSupabase();
          
          // Get user from Supabase by provider info
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('provider', token.provider as string)
            .eq('provider_id', token.providerAccountId as string)
            .single();

          if (user) {
            session.user.id = user.id;
          }
        } catch (error) {
          console.error('Session error:', error);
        }
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
