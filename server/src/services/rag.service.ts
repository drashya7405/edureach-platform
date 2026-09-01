import "dotenv/config";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import { createAgent, tool } from "langchain";
import { Document } from "@langchain/core/documents";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- MongoDB native client singleton ----
let mongoClient: MongoClient | null = null;

export const getChatModelName = (): string => {
  return process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash";
};

export const getEmbeddingModelName = (): string => {
  return process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
};

export const getMongoClient = async (): Promise<MongoClient> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    await mongoClient.connect();
  }
  return mongoClient;
};

// ---- Google GenAI Embeddings ----
export const getEmbeddings = (): GoogleGenerativeAIEmbeddings => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set in environment variables!");
  }
  return new GoogleGenerativeAIEmbeddings({
    apiKey,
    modelName: getEmbeddingModelName(),
  });
};

// ---- Vector Store ----
export const getVectorStore = async (): Promise<MongoDBAtlasVectorSearch> => {
  const client = await getMongoClient();
  const collection = client.db("edureach_db").collection("knowledge_docs");

  return new MongoDBAtlasVectorSearch(getEmbeddings(), {
    collection: collection as any,
    indexName: "edureach_vector_index",
    textKey: "text",
    embeddingKey: "embedding",
  });
};

// Helper to resolve knowledge base text
export const loadKnowledgeBaseText = async (): Promise<string> => {
  const candidatePaths = [
    path.join(__dirname, "../../knowledge-base/edureach-knowledge.txt"),
    path.join(process.cwd(), "server/knowledge-base/edureach-knowledge.txt"),
    path.join(process.cwd(), "knowledge-base/edureach-knowledge.txt"),
    path.resolve("server/knowledge-base/edureach-knowledge.txt"),
    path.resolve("knowledge-base/edureach-knowledge.txt"),
  ];

  for (const candidate of candidatePaths) {
    try {
      const content = await readFile(candidate, "utf8");
      if (content && content.trim()) {
        return content;
      }
    } catch {
      // Continue trying next candidate path
    }
  }

  // Built-in fallback summary if file is missing
  return `EduReach College is a premier engineering institution located in Hyderabad, Telangana, India.
Affiliated with JNTU Hyderabad and approved by AICTE.
Programs: B.Tech in CSE, ECE, AI & DS, IT, ME, CE. M.Tech in CS, VLSI, Structural Eng. MBA in Finance, Marketing, HR, IT.
Fees: B.Tech Tuition Rs 1,50,000/yr, Day scholar Rs 1,70,000/yr, Hosteller Rs 2,50,000/yr.
Placements: 92% overall placement rate, Highest package 42 LPA by Google, 150+ recruiting companies.
Admissions: TS/AP EAMCET (70%) and Management Quota (30%). Application opens March 1st.
Contact: admissions@edureach.edu.in, phone +91 9876543210.`;
};

// ============================================
// INDEXING — warms up embeddings in MongoDB
// ============================================
export const initializeKnowledgeBase = async (): Promise<void> => {
  if (!process.env.MONGODB_URI || !process.env.GOOGLE_API_KEY) {
    console.warn(" Skipping knowledge base init: MONGODB_URI or GOOGLE_API_KEY not configured.");
    return;
  }

  const client = await getMongoClient();
  const collection = client.db("edureach_db").collection("knowledge_docs");

  // Check if docs exist WITH valid (non-empty) embeddings
  const docWithEmbedding = await collection.findOne({
    embedding: { $exists: true, $not: { $size: 0 } },
  });

  if (docWithEmbedding) {
    const count = await collection.countDocuments();
    console.log(` Knowledge base ready (${count} chunks with embeddings)`);
    return;
  }

  // If docs exist but embeddings are empty → delete and re-index
  const existingCount = await collection.countDocuments();
  if (existingCount > 0) {
    console.log(` Found ${existingCount} chunks with EMPTY embeddings — deleting & re-indexing...`);
    await collection.deleteMany({});
  }

  console.log(" Indexing EduReach knowledge base...");

  const embeddings = getEmbeddings();
  try {
    const testResult = await embeddings.embedQuery("test");
    console.log(` Google GenAI embeddings OK — dimension: ${testResult.length}`);
  } catch (error: any) {
    console.error(" Embedding test failed:", error?.message || error);
    return;
  }

  // LOAD
  const fileContents = await loadKnowledgeBaseText();
  const docs = [
    new Document({
      pageContent: fileContents,
      metadata: { source: "edureach-knowledge.txt" },
    }),
  ];

  // SPLIT
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const allSplits = await splitter.splitDocuments(docs);
  console.log(` Split into ${allSplits.length} chunks`);

  // EMBED + STORE
  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection: collection as any,
    indexName: "edureach_vector_index",
    textKey: "text",
    embeddingKey: "embedding",
  });

  await vectorStore.addDocuments(allSplits);

  const verifyDoc = await collection.findOne({
    embedding: { $exists: true, $not: { $size: 0 } },
  });

  if (verifyDoc && Array.isArray(verifyDoc.embedding) && verifyDoc.embedding.length > 0) {
    console.log(` ${allSplits.length} chunks stored with ${verifyDoc.embedding.length}D embeddings.`);
    console.log(` Atlas Vector Search index requirement: name="edureach_vector_index", numDimensions=${verifyDoc.embedding.length}`);
  } else {
    await collection.deleteMany({});
    throw new Error("Embeddings could not be verified in MongoDB Atlas.");
  }
};

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
        console.warn(" Atlas Vector Search query failed, falling back to direct context:", vectorError?.message || vectorError);
      }

      // Fallback context from knowledge text
      const knowledge = await loadKnowledgeBaseText();
      return `Context from EduReach Knowledge Base:\n${knowledge.slice(0, 3000)}`;
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

// --- Get RAG Response ---
export const getRAGResponse = async (question: string): Promise<string> => {
  if (!process.env.GOOGLE_API_KEY) {
    return "EduReach Bot is currently being configured with AI credentials. For questions regarding admissions, courses, or fees, please contact admissions@edureach.edu.in or call +91 9876543210.";
  }

  try {
    const vectorStore = await getVectorStore();
    const retrieve = createRetrieveTool(vectorStore);

    const model = new ChatGoogleGenerativeAI({
      model: getChatModelName(),
      temperature: 0.7,
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const agent = createAgent({
      model,
      tools: [retrieve],
      systemPrompt:
        "You are EduReach Bot, an intelligent, helpful, and friendly AI admissions counselor for EduReach College, Hyderabad. " +
        "ALWAYS use the retrieve tool to search the knowledge base before providing an answer. " +
        "Provide clear, concise, and structured answers. " +
        "If specific details are not available in the knowledge base, politely say: " +
        "'I don't have that exact detail right now. Please reach out to our admissions team at admissions@edureach.edu.in or +91 9876543210.'",
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: question }],
    });

    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || !lastMessage.content) {
      return "I couldn't generate a response. Please ask again or contact our admissions office.";
    }

    if (typeof lastMessage.content === "string") {
      return lastMessage.content;
    }

    return JSON.stringify(lastMessage.content);
  } catch (error: any) {
    console.error("RAG Counselor Error:", error?.message || error);

    // Direct LLM fallback with knowledge base if agent loop encountered an issue
    try {
      const knowledge = await loadKnowledgeBaseText();
      const model = new ChatGoogleGenerativeAI({
        model: getChatModelName(),
        temperature: 0.5,
        apiKey: process.env.GOOGLE_API_KEY,
      });

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
    } catch (fallbackError) {
      console.error("Direct fallback failed:", fallbackError);
    }

    return "I'm having trouble retrieving details right now. Please try asking again or reach out to admissions@edureach.edu.in or +91 9876543210.";
  }
};
