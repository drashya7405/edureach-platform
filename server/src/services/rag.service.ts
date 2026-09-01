import "dotenv/config";
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { createAgent, tool } from "langchain";
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
let agentInstance: any = null;

export const getChatModelName = (): string => {
  return process.env.GEMINI_CHAT_MODEL || RAG_CONFIG.defaultChatModel;
};

export const getEmbeddingModelName = (): string => {
  return process.env.GEMINI_EMBEDDING_MODEL || RAG_CONFIG.defaultEmbeddingModel;
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
        serverSelectionTimeoutMS: 10000,
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
      temperature: 0.7,
      apiKey,
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
// LangChain Retrieval Tool
// ============================================
const createRetrieveTool = (vectorStore: MongoDBAtlasVectorSearch) => {
  return tool(
    async ({ query }: { query: string }) => {
      try {
        const retrievedDocs = await vectorStore.similaritySearch(query, 3);
        if (retrievedDocs && retrievedDocs.length > 0) {
          return retrievedDocs
            .map((doc) => `Source: ${doc.metadata?.source || "knowledge-base"}\nContent: ${doc.pageContent}`)
            .join("\n\n");
        }
      } catch (vectorError: any) {
        console.warn(
          "[RAG:VECTOR_SEARCH_ERROR] Atlas Vector Search similarity query failed, falling back to direct context:",
          vectorError?.message || vectorError
        );
      }

      // Fallback context from knowledge text
      const knowledge = await loadKnowledgeBaseText();
      if (knowledge) {
        return `Context from EduReach Knowledge Base:\n${knowledge.slice(0, 3000)}`;
      }
      return "Information not found in knowledge base.";
    },
    {
      name: "retrieve",
      description:
        "Retrieve accurate information from the EduReach College knowledge base for courses, fees, admissions, placements, mentors, and campus life.",
      schema: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    }
  );
};

// ============================================
// Get Agent Singleton
// ============================================
const getOrCreateAgent = async () => {
  if (!agentInstance) {
    const vectorStore = await getVectorStore();
    const retrieve = createRetrieveTool(vectorStore);
    const model = getChatModel();

    agentInstance = createAgent({
      model,
      tools: [retrieve],
      systemPrompt:
        "You are EduReach Bot, an intelligent, helpful, and friendly AI admissions counselor for EduReach College, Hyderabad. " +
        "ALWAYS use the retrieve tool to search the knowledge base before providing an answer. " +
        "Provide clear, concise, and structured answers. " +
        "If specific details are not available in the knowledge base, politely say: " +
        "'I don't have that exact detail right now. Please reach out to our admissions team at admissions@edureach.edu.in or +91 9876543210.'",
    });
  }
  return agentInstance;
};

// ============================================
// RAG Query Handler (Production Safe)
// ============================================
export const getRAGResponse = async (question: string): Promise<string> => {
  if (!process.env.GOOGLE_API_KEY) {
    return "EduReach Bot is currently configuring AI credentials. For questions regarding admissions, courses, or fees, please contact admissions@edureach.edu.in or call +91 9876543210.";
  }

  try {
    const agent = await getOrCreateAgent();
    const result = await agent.invoke({
      messages: [{ role: "user", content: question }],
    });

    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || !lastMessage.content) {
      return "I couldn't generate a response. Please ask again or contact our admissions office at admissions@edureach.edu.in.";
    }

    if (typeof lastMessage.content === "string") {
      return lastMessage.content;
    }

    return JSON.stringify(lastMessage.content);
  } catch (error: any) {
    console.error("[RAG:LLM_GENERATION_ERROR] Primary agent pipeline error:", error?.message || error);

    // Direct LLM fallback with knowledge base file if agent loop encountered an issue
    try {
      const knowledge = await loadKnowledgeBaseText();
      if (knowledge) {
        const model = getChatModel();

        const prompt = `You are EduReach Bot, the admissions counselor for EduReach College, Hyderabad.
Answer the following student question accurately using the provided EduReach College knowledge base.
Be concise, polite, and helpful.

Knowledge Base:
${knowledge}

Student Question:
${question}

Answer:`;

        const response = await model.invoke(prompt);
        if (typeof response.content === "string" && response.content.trim()) {
          return response.content;
        }
      }
    } catch (fallbackError: any) {
      console.error("[RAG:DIRECT_FALLBACK_ERROR] Direct LLM prompt fallback failed:", fallbackError?.message || fallbackError);
    }

    return "I'm having trouble retrieving details right now. Please try asking again or reach out to admissions@edureach.edu.in or +91 9876543210.";
  }
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
      agentInstance = null;
      chatModelInstance = null;
      embeddingsInstance = null;
      console.log("[RAG:CLEANUP] MongoDB native vector client closed gracefully.");
    } catch (err) {
      console.error("[RAG:CLEANUP_ERROR] Error closing MongoDB native client:", err);
    }
  }
};
