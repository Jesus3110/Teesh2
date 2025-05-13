import { MongoClient } from "mongodb";

const uri = import.meta.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

export async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db("chatbot"); // nombre de tu base local
  }
  return db;
}