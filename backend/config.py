import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # OpenAI API configuration
    # openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    ollama_server_url: str = os.getenv("OLLAMA_SERVER_URL", "http://localhost:11434")

    # Vector database configuration
    vector_db_path: str = os.getenv("VECTOR_DB_PATH", "./vector_store")
    vector_db_type: str = os.getenv("VECTOR_DB_TYPE", "chromadb")

    # PDF upload path
    pdf_upload_path: str = os.getenv("PDF_UPLOAD_PATH", "../data")

    # Embedding model configuration
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
    embedding_num_gpu: int = int(os.getenv("EMBEDDING_NUM_GPU", "1"))
    # get number of threads from environment variable or default to max available
    embedding_num_thread: int = int(os.getenv("EMBEDDING_NUM_THREAD", os.cpu_count()))

    # LLM configuration
    llm_model: str = os.getenv("LLM_MODEL", "deepseek-r1:7b")
    llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    max_tokens: int = int(os.getenv("MAX_TOKENS", "2048"))

    # Chunking configuration
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "200"))

    # Retrieval configuration
    retrieval_k: int = int(os.getenv("RETRIEVAL_K", "5"))
    similarity_threshold: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.3"))

    # Server configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"

    # CORS configuration
    allowed_origins: List[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    # Logging configuration
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"


settings = Settings()
