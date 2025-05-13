export const prerender = false;

import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get("imagen");
    const prompt = formData.get("prompt")?.toString().trim() || "Describe esta imagen";
    const conversacionId = formData.get("conversacionId");

    if (!file) {
      return new Response(JSON.stringify({ error: "No se recibió ninguna imagen" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Leer como base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Consulta a GPT-4o
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { type: "text", text: prompt, role: "user" },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
            },
          },
        ],
      }),
    });

    const json = await openaiResponse.json();
    const reply = json.choices?.[0]?.message?.content || "No pude analizar la imagen.";

    const db = await getDb();

    let nuevaConversacionId = conversacionId;

    // Si no hay conversación, crear nueva
    if (!conversacionId) {
      const nueva = await db.collection("conversaciones").insertOne({
        titulo: "🖼 Imagen enviada",
        mensajes: [
          ...(prompt ? [{ rol: "user", contenido: prompt }] : []),
          {
            rol: "user",
            contenido: "[imagen]",
            imagenBase64: `data:image/jpeg;base64,${base64}`,
          },
          {
            rol: "assistant",
            contenido: reply,
          },
        ],
        fecha: new Date(),
      });
      nuevaConversacionId = nueva.insertedId;
    } else {
      // Si ya hay, agregar a ella
      const mensajesAInsertar = [
        ...(prompt ? [{ rol: "user", contenido: prompt }] : []),
        {
          rol: "user",
          contenido: "[imagen]",
          imagenBase64: `data:image/jpeg;base64,${base64}`,
        },
        {
          rol: "assistant",
          contenido: reply,
        },
      ];

      await db.collection("conversaciones").updateOne(
        { _id: new ObjectId(conversacionId) },
        { $push: { mensajes: { $each: mensajesAInsertar } } }
      );
    }

    return new Response(JSON.stringify({ reply, conversacionId: nuevaConversacionId }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error procesando imagen:", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
