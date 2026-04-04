export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    try {
      const body = await request.text();

      const resp = await fetch(
        "https://poultryfarmautomation.onrender.com/ingest",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body,
        },
      );

      const text = await resp.text();

      return new Response(text || "FORWARDED", { status: resp.status });
    } catch (err) {
      return new Response("Forward error", { status: 500 });
    }
  },
};
