export const RAG_CONFIG = {
  DATABASE_NAME: "edureach_db",
  COLLECTION_NAME: "knowledge_docs",
  STAGING_COLLECTION_NAME: "knowledge_docs_staging",
  INDEX_NAME: "edureach_vector_index",
  EMBEDDING_FIELD: "embedding",
  EMBEDDING_DIMENSIONS: 768,
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,
  SIMILARITY_K: 4,
} as const;
