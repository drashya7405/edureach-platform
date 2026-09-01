import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const RAG_CONFIG = {
  databaseName: "edureach_db",
  collectionName: "knowledge_docs",
  stagingCollectionName: "knowledge_docs_staging",
  vectorIndexName: "edureach_vector_index",
  embeddingField: "embedding",
  textField: "text",
  metadataField: "metadata",
  embeddingDimensions: 768, // Google text-embedding-004 dimension
  defaultChatModel: "gemini-1.5-flash",
  defaultEmbeddingModel: "text-embedding-004",
  chunkSize: 1000,
  chunkOverlap: 200,
  knowledgeFileCandidates: [
    path.resolve(__dirname, "../../knowledge-base/edureach-knowledge.txt"),
    path.resolve(process.cwd(), "server/knowledge-base/edureach-knowledge.txt"),
    path.resolve(process.cwd(), "knowledge-base/edureach-knowledge.txt"),
    path.resolve("server/knowledge-base/edureach-knowledge.txt"),
    path.resolve("knowledge-base/edureach-knowledge.txt"),
  ],
} as const;
