/** Values from .env (see .env.example), inlined at build time. */
declare module '@env' {
  export const XKIRO_API_KEY: string | undefined;
  export const XKIRO_BASE_URL: string | undefined;
  export const XKIRO_MODEL: string | undefined;
}
