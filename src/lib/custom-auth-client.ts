/**
 * Custom Authentication Client
 * Simple auth implementation for Hardy Auth
 */

export const customAuthClient = {
  signUp: {
    email: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      try {
        console.log('Sending sign-up request:', { email, name, passwordLength: password.length });

        const response = await fetch('/api/custom-auth/sign-up', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();
        console.log('Sign-up response:', { status: response.status, data });

        if (!response.ok) {
          return { data: null, error: data.error };
        }

        return { data: data.data, error: null };
      } catch (error: any) {
        console.error('Sign-up fetch error:', error);
        return { data: null, error: { message: error.message } };
      }
    },
  },

  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      try {
        const response = await fetch('/api/custom-auth/sign-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { data: null, error: data.error };
        }

        return { data: data.data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },
  },

  signOut: async () => {
    try {
      const response = await fetch('/api/custom-auth/sign-out', {
        method: 'POST',
      });

      if (response.ok) {
        return { data: true, error: null };
      } else {
        return { data: null, error: { message: 'Sign out failed' } };
      }
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  },
};