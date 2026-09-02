import "dotenv/config";
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { RAG_CONFIG } from "../config/rag.config.ts";

// ============================================
// Resource Singletons (Cached for performance)
// ============================================
let mongoClient: MongoClient | null = null;
let embeddingsInstance: GoogleGenerativeAIEmbeddings | null = null;
let vectorStoreInstance: MongoDBAtlasVectorSearch | null = null;
let chatModelInstance: ChatGoogleGenerativeAI | null = null;

export const getChatModelName = (): string => {
  return process.env.GEMINI_CHAT_MODEL || RAG_CONFIG.defaultChatModel;
};

export const getEmbeddingModelName = (): string => {
  return process.env.GEMINI_EMBEDDING_MODEL || RAG_CONFIG.defaultEmbeddingModel;
};

// ---- Helper: Promise Timeout Wrapper ----
const withTimeout = <T>(promise: Promise<T>, ms: number, operationName: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[TIMEOUT] ${operationName} exceeded ${ms}ms limit`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// ---- MongoDB Native Client Singleton ----
export const getMongoClient = async (): Promise<MongoClient> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("[RAG:CONFIG_ERROR] MONGODB_URI is not defined in environment variables");
  }

  if (!mongoClient) {
    try {
      mongoClient = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 10000,
      });
      await mongoClient.connect();
    } catch (err: any) {
      mongoClient = null;
      console.error("[RAG:MONGO_CONNECTION_ERROR] Failed to connect native MongoDB client:", err?.message || err);
      throw err;
    }
  }
  return mongoClient;
};

// ---- Google GenAI Embeddings Singleton ----
export const getEmbeddings = (): GoogleGenerativeAIEmbeddings => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("[RAG:CONFIG_ERROR] GOOGLE_API_KEY is not set in environment variables");
  }

  if (!embeddingsInstance) {
    embeddingsInstance = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: getEmbeddingModelName(),
      maxRetries: 1,
    });
  }
  return embeddingsInstance;
};

// ---- Vector Store Singleton ----
export const getVectorStore = async (): Promise<MongoDBAtlasVectorSearch> => {
  if (!vectorStoreInstance) {
    const client = await getMongoClient();
    const collection = client.db(RAG_CONFIG.databaseName).collection(RAG_CONFIG.collectionName);

    vectorStoreInstance = new MongoDBAtlasVectorSearch(getEmbeddings(), {
      collection: collection as any,
      indexName: RAG_CONFIG.vectorIndexName,
      textKey: RAG_CONFIG.textField,
      embeddingKey: RAG_CONFIG.embeddingField,
    });
  }
  return vectorStoreInstance;
};

// ---- Chat Model Singleton ----
export const getChatModel = (): ChatGoogleGenerativeAI => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("[RAG:CONFIG_ERROR] GOOGLE_API_KEY is not set in environment variables");
  }

  if (!chatModelInstance) {
    chatModelInstance = new ChatGoogleGenerativeAI({
      model: getChatModelName(),
      temperature: 0.3,
      apiKey,
      maxRetries: 1,
    });
  }
  return chatModelInstance;
};

// ---- Helper to read knowledge base text from file ----
let cachedKnowledgeText: string | null = null;

export const loadKnowledgeBaseText = async (): Promise<string | null> => {
  if (cachedKnowledgeText) {
    return cachedKnowledgeText;
  }

  for (const candidate of RAG_CONFIG.knowledgeFileCandidates) {
    try {
      const content = await readFile(candidate, "utf8");
      if (content && content.trim()) {
        cachedKnowledgeText = content.trim();
        return cachedKnowledgeText;
      }
    } catch {
      // Continue trying next candidate path
    }
  }

  return null;
};

// ============================================
// Non-Destructive Startup Status Check
// ============================================
export const checkKnowledgeBaseStatus = async (): Promise<void> => {
  if (!process.env.MONGODB_URI || !process.env.GOOGLE_API_KEY) {
    console.warn("[RAG:STATUS] Skipping knowledge status check: MONGODB_URI or GOOGLE_API_KEY not configured.");
    return;
  }

  try {
    const client = await getMongoClient();
    const collection = client.db(RAG_CONFIG.databaseName).collection(RAG_CONFIG.collectionName);
    const count = await collection.countDocuments();

    if (count > 0) {
      console.log(`[RAG:STATUS] Knowledge base online with ${count} indexed chunks.`);
    } else {
      console.warn(`[RAG:STATUS] Knowledge base collection '${RAG_CONFIG.collectionName}' is empty.`);
      console.warn(`             Run 'npm run index:knowledge' to build embeddings.`);
    }
  } catch (error: any) {
    console.warn(`[RAG:STATUS] Could not check knowledge base status:`, error?.message || error);
  }
};

// ============================================
// High-Performance Grounded RAG Query Handler
// ============================================
export const getRAGResponse = async (question: string): Promise<string> => {
  const startTime = Date.now();
  console.log(`[CHAT] Request received: "${question.slice(0, 80)}"`);

  if (!process.env.GOOGLE_API_KEY) {
    console.warn("[CHAT] GOOGLE_API_KEY not configured in environment.");
    return "EduReach Bot is currently configuring AI credentials. For questions regarding admissions, courses, or fees, please contact admissions@edureach.edu.in or call +91 9876543210.";
  }

  let retrievedContext = "";
  let retrievedCount = 0;

  // 1. Vector Search Step (with strict 6s timeout)
  const retrievalStart = Date.now();
  try {
    const vectorStore = await getVectorStore();
    const initDuration = Date.now() - retrievalStart;
    console.log(`[CHAT] Retriever / Vector store initialization: ${initDuration} ms`);

    const searchStart = Date.now();
    const docs = await withTimeout(
      vectorStore.similaritySearch(question, 3),
      6000,
      "Atlas Vector Search"
    );
    const searchDuration = Date.now() - searchStart;
    retrievedCount = docs.length;
    console.log(`[CHAT] Vector search: ${searchDuration} ms (retrieved ${retrievedCount} chunks)`);

    if (docs && docs.length > 0) {
      retrievedContext = docs
        .map((doc, i) => `[Context Chunk ${i + 1}]\n${doc.pageContent}`)
        .join("\n\n");
    }
  } catch (vectorError: any) {
    console.warn(`[CHAT:RETRIEVAL_WARN] Vector retrieval bypassed (${vectorError?.message || vectorError}). Using fallback context.`);
  }

  // 2. Context Preparation Step
  const prepStart = Date.now();
  if (!retrievedContext) {
    const fallbackText = await loadKnowledgeBaseText();
    if (fallbackText) {
      retrievedContext = fallbackText.slice(0, 2500);
      console.log(`[CHAT] Context preparation: ${Date.now() - prepStart} ms (used file fallback context)`);
    } else {
      console.log(`[CHAT] Context preparation: ${Date.now() - prepStart} ms (no document context available)`);
    }
  } else {
    console.log(`[CHAT] Context preparation: ${Date.now() - prepStart} ms (context length: ${retrievedContext.length} chars)`);
  }

  // 3. Single-Turn Grounded Gemini Request (with strict 15s timeout)
  const geminiStart = Date.now();
  try {
    const model = getChatModel();

    const systemInstruction =
      "You are EduReach Bot, the intelligent, friendly, and helpful AI admissions counselor for EduReach College, Hyderabad.\n" +
      "Guidelines:\n" +
      "1. Ground your answers strictly in the provided College Knowledge Base below.\n" +
      "2. Provide clear, concise, and structured answers for courses, eligibility, fee structures, placements, mentors, and campus life.\n" +
      "3. If specific details requested by the student are not present in the provided knowledge base, politely say:\n" +
      "   'I don't have that exact detail right now. Please reach out to our admissions team at admissions@edureach.edu.in or call +91 9876543210.'\n" +
      "4. Maintain a warm, encouraging, and professional tone.";

    const prompt = `${systemInstruction}\n\nCollege Knowledge Base:\n${retrievedContext || "No specific document matched."}\n\nStudent Question:\n${question}\n\nCounselor Answer:`;

    const response = await withTimeout(
      model.invoke(prompt),
      15000,
      "Gemini Chat Generation"
    );

    const geminiDuration = Date.now() - geminiStart;
    console.log(`[CHAT] Gemini request: ${geminiDuration} ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`[CHAT] Total request: ${totalDuration} ms`);

    if (typeof response.content === "string" && response.content.trim()) {
      return response.content.trim();
    }
    if (Array.isArray(response.content)) {
      const text = response.content
        .map((c: any) => (typeof c === "string" ? c : c.text || ""))
        .join(" ")
        .trim();
      if (text) return text;
    }
  } catch (geminiError: any) {
    const geminiDuration = Date.now() - geminiStart;
    console.error(`[CHAT:ERROR] Gemini generation failed after ${geminiDuration} ms:`, geminiError?.message || geminiError);
  }

  const totalDuration = Date.now() - startTime;
  console.log(`[CHAT] Total request (safe exit): ${totalDuration} ms`);
  return "I'm having trouble retrieving details right now. Please try asking again or reach out to admissions@edureach.edu.in or +91 9876543210.";
};

// ============================================
// Graceful Cleanup
// ============================================
export const closeVectorMongoClient = async (): Promise<void> => {
  if (mongoClient) {
    try {
      await mongoClient.close();
      mongoClient = null;
      vectorStoreInstance = null;
      chatModelInstance = null;
      embeddingsInstance = null;
      console.log("[RAG:CLEANUP] MongoDB native vector client closed gracefully.");
    } catch (err) {
      console.error("[RAG:CLEANUP_ERROR] Error closing MongoDB native client:", err);
    }
  }
};

