import "dotenv/config";
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RAG_CONFIG } from "../config/rag.config.ts";

async function verifyKnowledgeBase() {
  console.log("=================================================");
  console.log(" EduReach Knowledge Base Verification");
  console.log("=================================================\n");

  const uri = process.env.MONGODB_URI;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!uri) {
    console.error("[FAIL] MONGODB_URI is not set.");
    process.exit(1);
  }
  if (!apiKey) {
    console.error("[FAIL] GOOGLE_API_KEY is not set.");
    process.exit(1);
  }

  // 1. File verification
  let foundFile = false;
  let fileLength = 0;
  for (const candidate of RAG_CONFIG.knowledgeFileCandidates) {
    try {
      const content = await readFile(candidate, "utf8");
      if (content && content.trim().length > 100) {
        foundFile = true;
        fileLength = content.length;
        console.log(`[PASS] Knowledge file exists: ${candidate} (${fileLength} chars)`);
        break;
      }
    } catch {
      // continue
    }
  }

  if (!foundFile) {
    console.error("[FAIL] Knowledge base file could not be read from disk.");
    process.exit(1);
  }

  // 2. Gemini Embeddings API check
  try {
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: process.env.GEMINI_EMBEDDING_MODEL || RAG_CONFIG.defaultEmbeddingModel,
    });
    const testEmbedding = await embeddings.embedQuery("Health check");
    console.log(`[PASS] Google GenAI embeddings operational (${testEmbedding.length} dimensions)`);
  } catch (err: any) {
    console.error(`[FAIL] Google GenAI embeddings check failed: ${err.message}`);
    process.exit(1);
  }

  // 3. MongoDB collection check
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const collection = client.db(RAG_CONFIG.databaseName).collection(RAG_CONFIG.collectionName);
    const count = await collection.countDocuments();

    if (count === 0) {
      console.warn(`[WARN] Collection '${RAG_CONFIG.collectionName}' is empty.`);
      console.log(`       Run 'npm run index:knowledge' to populate the knowledge base.`);
      return;
    }

    console.log(`[PASS] MongoDB collection '${RAG_CONFIG.collectionName}' contains ${count} chunks.`);

    const sample = await collection.findOne({
      embedding: { $exists: true, $not: { $size: 0 } },
    });

    if (sample && Array.isArray(sample.embedding)) {
      console.log(`[PASS] Embeddings present in documents (${sample.embedding.length}D array).`);
      console.log(`[PASS] Text field present: "${sample.text?.slice(0, 60).replace(/\n/g, " ")}..."`);
      console.log(`[PASS] Metadata present:`, JSON.stringify(sample.metadata || {}));
    } else {
      console.error(`[FAIL] Documents exist but embeddings are missing or invalid.`);
      console.log(`       Run 'npm run index:knowledge' to rebuild embeddings.`);
      process.exit(1);
    }

    console.log("\n[SUCCESS] Knowledge base and RAG subsystem verified successfully.\n");
  } finally {
    await client.close();
  }
}

verifyKnowledgeBase().catch((err) => {
  console.error("[VERIFICATION ERROR]:", err?.message || err);
  process.exit(1);
});
