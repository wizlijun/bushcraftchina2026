export default {
  async fetch(): Promise<Response> {
    return new Response("bootstrapping", { status: 503 });
  },
};
