from typing import List, Tuple
from langchain.schema import Document
from config import settings
import logging

# Chroma and Embeddings imports
from langchain_community.vectorstores import Chroma
from langchain.embeddings import OllamaEmbeddings

logger = logging.getLogger(__name__)


class VectorStoreService:
    def __init__(self):
        """Initialize vector store service"""
        self.embeddings = OllamaEmbeddings(
            base_url=settings.ollama_server_url,
            model=settings.embedding_model,
            num_gpu=settings.embedding_num_gpu,
            num_thread=settings.embedding_num_thread,
            show_progress=True,
        )
        """Initialize Chroma vector store"""
        self.vectordb = Chroma(
            persist_directory=settings.vector_db_path,
            embedding_function=self.embeddings,
        )

    def add_documents(self, documents: List[Document]) -> None:
        """Add documents to the vector store"""
        import time

        if not documents:
            logger.warning("No documents to add to vector store.")
            return
        logger.info(f"Adding {len(documents)} documents to vector store...")
        start = time.time()
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch = documents[i : i + batch_size]
            self.vectordb.add_documents(batch)
            logger.info(f"Inserted batch {i // batch_size + 1} ({len(batch)} docs)")
        self.vectordb.persist()
        elapsed = round(time.time() - start, 2)
        logger.info(
            f"Added {len(documents)} documents to vector store in {elapsed} seconds."
        )

    def similarity_search(
        self, query: str, k: int = None
    ) -> List[Tuple[Document, float]]:
        """Search for similar documents"""
        k = k or settings.retrieval_k
        results = self.vectordb.similarity_search_with_score(query, k=k)
        return results

    def delete_documents(self, document_ids: List[str]) -> None:
        """Delete documents from vector store"""
        self.vectordb.delete(ids=document_ids)
        self.vectordb.persist()
        logger.info(f"Deleted {len(document_ids)} documents from vector store.")

    def get_document_count(self) -> int:
        """Get total number of documents in vector store"""
        return self.vectordb._collection.count()
