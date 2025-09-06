import '@fastify/session';

declare module 'fastify' {
  interface FastifyRequest {
    session: import('@fastify/session').FastifySessionObject & {
      walletAddress?: string;
      requestToken?: string;
    };
  }
}