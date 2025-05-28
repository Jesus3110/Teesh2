// src/pages/api/debug.js
export async function GET() {
  return new Response(
    JSON.stringify({
      mongo: !!import.meta.env.MONGO_URI,
      openai: !!import.meta.env.PUBLIC_OPENAI_API_KEY
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
