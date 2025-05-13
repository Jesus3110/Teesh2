// ✅ src/pages/api/historial.js
export const prerender = false;

import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

export async function GET({ url }) {
  try {
    const db = await getDb();
    const id = url.searchParams.get("id");

    if (id) {
      const conv = await db.collection("conversaciones").findOne({ _id: new ObjectId(id) });
      return new Response(JSON.stringify({ mensajes: conv?.mensajes || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      const historial = await db.collection("conversaciones")
        .find({}, { projection: { titulo: 1 } })
        .sort({ fecha: -1 })
        .toArray();

      return new Response(JSON.stringify({ historial }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al obtener historial" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE({ request }) {
  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: "Falta ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await getDb();
    await db.collection("conversaciones").deleteOne({ _id: new ObjectId(id) });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al eliminar conversación" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}