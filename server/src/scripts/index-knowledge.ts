import "dotenv/config";
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { RAG_CONFIG } from "../config/rag.config.ts";

async function loadKnowledgeText(): Promise<{ text: string; sourcePath: string }> {
  for (const candidate of RAG_CONFIG.knowledgeFileCandidates) {
    try {
      const content = await readFile(candidate, "utf8");
      if (content && content.trim().length > 100) {
        return { text: content.trim(), sourcePath: candidate };
      }
    } catch {
      // Try next candidate path
    }
  }
  throw new Error(
    `Knowledge base file not found or empty. Checked paths:\n${RAG_CONFIG.knowledgeFileCandidates.join("\n")}`
  );
}

async function runSafeIndexing() {
  console.log("=================================================");
  console.log(" EduReach Knowledge Base Safe Indexing Pipeline");
  console.log("=================================================\n");

  // 1. Validate environment
  const uri = process.env.MONGODB_URI;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!uri) {
    console.error("[ERROR] MONGODB_URI is not defined in environment.");
    process.exit(1);
  }

  if (!apiKey) {
    console.error("[ERROR] GOOGLE_API_KEY is not defined in environment.");
    process.exit(1);
  }

  const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || RAG_CONFIG.defaultEmbeddingModel;
  console.log(`[1/8] Environment validated.`);
  console.log(`      - Target Database: ${RAG_CONFIG.databaseName}`);
  console.log(`      - Target Collection: ${RAG_CONFIG.collectionName}`);
  console.log(`      - Embedding Model: ${embeddingModel}`);

  // 2. Read knowledge-base file
  console.log(`\n[2/8] Loading knowledge base file...`);
  const { text: knowledgeText, sourcePath } = await loadKnowledgeText();
  console.log(`      - Loaded from: ${sourcePath}`);
  console.log(`      - Total characters: ${knowledgeText.length}`);

  // 3. Split into document chunks
  console.log(`\n[3/8] Splitting document into chunks (chunkSize=${RAG_CONFIG.chunkSize}, overlap=${RAG_CONFIG.chunkOverlap})...`);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: RAG_CONFIG.chunkSize,
    chunkOverlap: RAG_CONFIG.chunkOverlap,
  });

  const rawDocs = [
    new Document({
      pageContent: knowledgeText,
      metadata: { source: "edureach-knowledge.txt", indexedAt: new Date().toISOString() },
    }),
  ];

  const splits = await splitter.splitDocuments(rawDocs);
  console.log(`      - Generated ${splits.length} text chunks.`);

  if (splits.length === 0) {
    throw new Error("Document splitting produced 0 chunks.");
  }

  // 4. Initialize Gemini embeddings & test
  console.log(`\n[4/8] Initializing Google GenAI Embeddings...`);
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    modelName: embeddingModel,
  });

  const testEmbedding = await embeddings.embedQuery("Test verification query");
  console.log(`      - Test embedding generated successfully.`);
  console.log(`      - Output dimensions: ${testEmbedding.length} (Expected: ${RAG_CONFIG.embeddingDimensions})`);

  if (testEmbedding.length !== RAG_CONFIG.embeddingDimensions) {
    console.warn(
      `      [WARNING] Embedding dimension ${testEmbedding.length} differs from expected ${RAG_CONFIG.embeddingDimensions}. ` +
      `Ensure Atlas Vector Search index is configured with numDimensions: ${testEmbedding.length}.`
    );
  }

  // 5. Generate embeddings for all splits
  console.log(`\n[5/8] Generating embeddings for ${splits.length} chunks...`);
  const docsWithEmbeddings: Array<{
    text: string;
    embedding: number[];
    metadata: Record<string, any>;
  }> = [];

  for (let i = 0; i < splits.length; i++) {
    const chunk = splits[i]!;
    const chunkEmbedding = await embeddings.embedQuery(chunk.pageContent);

    if (!Array.isArray(chunkEmbedding) || chunkEmbedding.length === 0) {
      throw new Error(`Failed to generate valid embedding for chunk #${i + 1}`);
    }

    docsWithEmbeddings.push({
      text: chunk.pageContent,
      embedding: chunkEmbedding,
      metadata: {
        ...chunk.metadata,
        chunkIndex: i,
        totalChunks: splits.length,
        indexedAt: new Date().toISOString(),
      },
    });

    process.stdout.write(`      - Processed chunk ${i + 1}/${splits.length} (${chunkEmbedding.length}D)\r`);
  }
  console.log(`\n      - All ${docsWithEmbeddings.length} chunk embeddings generated and verified.`);

  // 6. Connect to MongoDB
  console.log(`\n[6/8] Connecting to MongoDB Atlas...`);
  const mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await mongoClient.connect();
  const db = mongoClient.db(RAG_CONFIG.databaseName);
  const stagingCollection = db.collection(RAG_CONFIG.stagingCollectionName);
  const liveCollection = db.collection(RAG_CONFIG.collectionName);

  try {
    // 7. Write to staging collection first (staged verification before live replacement)
    console.log(`\n[7/8] Writing to staging collection '${RAG_CONFIG.stagingCollectionName}'...`);
    await stagingCollection.deleteMany({});
    const insertResult = await stagingCollection.insertMany(docsWithEmbeddings);
    console.log(`      - Inserted ${insertResult.insertedCount} documents into staging.`);

    if (insertResult.insertedCount !== docsWithEmbeddings.length) {
      throw new Error(
        `Staging insert count mismatch: expected ${docsWithEmbeddings.length}, got ${insertResult.insertedCount}`
      );
    }

    // Verify staging documents
    const sampleStaging = await stagingCollection.findOne({
      embedding: { $exists: true, $not: { $size: 0 } },
    });

    if (!sampleStaging || !Array.isArray(sampleStaging.embedding) || sampleStaging.embedding.length === 0) {
      throw new Error("Staging collection embedding verification failed.");
    }

    // Replace live collection safely
    console.log(`      - Replacing live collection '${RAG_CONFIG.collectionName}'...`);
    await liveCollection.deleteMany({});
    await liveCollection.insertMany(docsWithEmbeddings);
    await stagingCollection.deleteMany({});

    // 8. Verify live collection
    console.log(`\n[8/8] Verifying live collection '${RAG_CONFIG.collectionName}'...`);
    const liveCount = await liveCollection.countDocuments();
    const liveSample = await liveCollection.findOne();

    console.log(`      - Live document count: ${liveCount}`);
    console.log(`      - Sample embedding dimensions: ${liveSample?.embedding?.length}D`);
    console.log(`      - Sample text excerpt: "${liveSample?.text?.slice(0, 80).replace(/\n/g, " ")}..."`);

    console.log("\n=================================================");
    console.log(" Knowledge Base Indexing Completed Successfully!");
    console.log("=================================================");
    console.log(`\nAtlas Vector Search Index Requirements:`);
    console.log(`  - Database: ${RAG_CONFIG.databaseName}`);
    console.log(`  - Collection: ${RAG_CONFIG.collectionName}`);
    console.log(`  - Index Name: ${RAG_CONFIG.vectorIndexName}`);
    console.log(`  - Fields:`);
    console.log(`      {`);
    console.log(`        "type": "vector",`);
    console.log(`        "path": "embedding",`);
    console.log(`        "numDimensions": ${liveSample?.embedding?.length || RAG_CONFIG.embeddingDimensions},`);
    console.log(`        "similarity": "cosine"`);
    console.log(`      }\n`);
  } finally {
    await mongoClient.close();
  }
}

runSafeIndexing().catch((error) => {
  console.error("\n[INDEXING FAILED]:", error?.message || error);
  process.exit(1);
});
