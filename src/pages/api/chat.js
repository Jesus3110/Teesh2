  // ✅ src/pages/api/chat.js
  export const prerender = false;

  import { getDb } from "../../lib/mongo";
  import { ObjectId } from "mongodb";

  function generarTituloIngenioso(prompt) {
    const lower = prompt.toLowerCase();
    if (lower.includes("error")) return `🐞 Error: ${prompt.slice(0, 20)}...`;
    if (lower.includes("código")) return `💻 Código: ${prompt.slice(0, 20)}...`;
    if (lower.includes("esp32")) return `📡 ESP32: ${prompt.slice(0, 20)}...`;
    if (lower.includes("cómo")) return `❓ Cómo: ${prompt.slice(0, 20)}...`;
    if (lower.includes("bug")) return `🔍 Bug: ${prompt.slice(0, 20)}...`;
    if (lower.includes("api")) return `🔗 API: ${prompt.slice(0, 20)}...`;
    return prompt.length > 30 ? `🗂 ${prompt.slice(0, 30)}...` : `🗂 ${prompt}`;
  }

  export async function POST({ request }) {
    const text = await request.text();
    let json = {};

    try {
      json = JSON.parse(text);
    } catch (e) {
  console.error("❌ ERROR /api/chat:", e);
  return new Response(
    JSON.stringify({ error: "Error en servidor", detalle: e.message }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

    const { prompt, conversacionId, mensajes: historial = [] } = json;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt vacío" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = import.meta.env.PUBLIC_OPENAI_API_KEY;
    const mensajesOpenAI = [
    { role: "system", content: "Eres un asistente útil." },
    ...historial.map(m => ({ role: m.rol, content: m.contenido })),
    { role: "user", content: prompt },
  ];

  const body = {
    model: "gpt-4o-mini",
    messages: mensajesOpenAI,
    temperature: 0.7,
  };


    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content.trim() || "Sin respuesta.";

    const db = await getDb();
    let nuevaConversacionId = conversacionId;

    if (!conversacionId) {
      const titulo = generarTituloIngenioso(prompt);
      const nueva = await db.collection("conversaciones").insertOne({
        titulo,
        mensajes: [
          { rol: "user", contenido: prompt },
          { rol: "assistant", contenido: reply },
        ],
        fecha: new Date(),
      });
      nuevaConversacionId = nueva.insertedId;
    } else {
      await db.collection("conversaciones").updateOne(
        { _id: new ObjectId(conversacionId) },
        {
          $push: {
            mensajes: [
              { rol: "user", contenido: prompt },
              { rol: "assistant", contenido: reply },
            ],
          },
        }
      );
    }

    return new Response(JSON.stringify({ reply, conversacionId: nuevaConversacionId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  export async function PATCH({ request }) {
    const text = await request.text();
    let json = {};

    try {
      json = JSON.parse(text);
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id, nuevoTitulo } = json;
    if (!id || !nuevoTitulo) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await getDb();
    await db.collection("conversaciones").updateOne(
      { _id: new ObjectId(id) },
      { $set: { titulo: nuevoTitulo } }
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }