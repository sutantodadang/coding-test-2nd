import re
import json
from typing import List, Dict, Any, Tuple
from langchain.schema import Document
from services.vector_store import VectorStoreService
from config import settings
import logging
import time
from ollama import Client, generate

logger = logging.getLogger(__name__)


class RAGPipeline:
    def __init__(self):
        self.vector_store = VectorStoreService()
        self.llm_model = settings.llm_model
        self.llm_temperature = settings.llm_temperature
        self.max_tokens = settings.max_tokens
        self.similarity_threshold = settings.similarity_threshold
        self.retrieval_k = settings.retrieval_k
        self.ollama_server_url = settings.ollama_server_url
        self.ollama_client = Client(
            host=self.ollama_server_url,
        )

    def generate_answer(
        self, question: str, chat_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        docs_with_scores = self._retrieve_documents(question)
        context = self._generate_context([doc for doc, score in docs_with_scores])
        answer = self._generate_llm_response(question, context, chat_history)
        sources = []
        for doc, score in docs_with_scores:
            meta = doc.metadata or {}
            sources.append(
                {
                    "content": doc.page_content,
                    "page": meta.get("page", 0),
                    "score": float(score),
                    "metadata": meta,
                }
            )
        processing_time = round(time.time() - start_time, 2)
        return {
            "answer": answer,
            "sources": sources,
            "processing_time": processing_time,
        }

    def _retrieve_documents(self, query: str) -> List[Tuple[Document, float]]:
        results = self.vector_store.similarity_search(query, k=self.retrieval_k)
        filtered = [
            (doc, score) for doc, score in results if score >= self.similarity_threshold
        ]
        return filtered

    def _generate_context(self, documents: List[Document]) -> str:
        return "\n\n".join([doc.page_content for doc in documents])

    def stream_answer(self, question: str, chat_history: List[Dict[str, str]] = None):
        start_time = time.time()
        docs_with_scores = self._retrieve_documents(question)
        context = self._generate_context([doc for doc, score in docs_with_scores])
        sources = []
        for doc, score in docs_with_scores:
            meta = doc.metadata or {}
            sources.append(
                {
                    "content": doc.page_content,
                    "page": meta.get("page", 0),
                    "score": float(score),
                    "metadata": meta,
                }
            )
        prompt = f"You are a expert financial assistant. Use all your ability to provide best answer the question.\n\nContext:\n{context}\n\nQuestion: {question}\nAnswer:"
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = generate(
                    model=self.llm_model,
                    prompt=prompt,
                    stream=True,
                    options={
                        "num_ctx": 4096,
                        "temperature": self.llm_temperature,
                        "max_tokens": self.max_tokens,
                    },
                )
                answer = ""
                inside_think_block = False
                think_buffer = ""

                for chunk in response:
                    if isinstance(chunk, dict) and "response" in chunk:
                        token = chunk["response"]
                    elif hasattr(chunk, "response"):
                        token = chunk.response
                    else:
                        logger.warning(
                            f"Unexpected chunk format: {type(chunk)} - {chunk}"
                        )
                        continue

                    if "<think>" in token:
                        inside_think_block = True
                        before_think = token.split("<think>")[0]
                        if before_think:
                            answer += before_think
                            yield before_think
                        continue

                    if inside_think_block:
                        think_buffer += token
                        if "</think>" in think_buffer:
                            after_think = think_buffer.split("</think>", 1)
                            if len(after_think) > 1 and after_think[1]:
                                clean_token = after_think[1]
                                answer += clean_token
                                yield clean_token
                            inside_think_block = False
                            think_buffer = ""
                        continue

                    if token:
                        answer += token
                        yield token

                processing_time = round(time.time() - start_time, 2)
                meta = json.dumps(
                    {"sources": sources, "processing_time": processing_time}
                )
                yield f"[END_META]{meta}"
                return
            except Exception as e:
                logger.error(f"Ollama LLM request failed (attempt {attempt + 1}): {e}")
                time.sleep(2)
        yield "[Error: LLM service unavailable or returned no answer]"
