from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from models.schemas import (
    DocumentsResponse,
    UploadResponse,
    ChunksResponse,
)
from services.pdf_processor import PDFProcessor
from services.vector_store import VectorStoreService
from services.rag_pipeline import RAGPipeline
from config import settings
import logging
import time
import os
from datetime import datetime

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RAG-based Financial Statement Q&A System",
    description="AI-powered Q&A system for financial documents using RAG",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pdf_processor = PDFProcessor()
vector_store = VectorStoreService()
rag_pipeline = RAGPipeline()

# Track uploaded documents in memory
documents_info = []
document_chunks = []


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting RAG Q&A System...")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "RAG-based Financial Statement Q&A System is running"}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process PDF file"""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    save_path = os.path.join(settings.pdf_upload_path, file.filename)
    os.makedirs(settings.pdf_upload_path, exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(await file.read())
    start_time = time.time()
    documents = pdf_processor.process_pdf(save_path)
    vector_store.add_documents(documents)
    processing_time = round(time.time() - start_time, 2)

    doc_info = {
        "filename": file.filename,
        "upload_date": datetime.utcnow(),
        "chunks_count": len(documents),
        "status": "processed",
    }
    documents_info.append(doc_info)

    for idx, doc in enumerate(documents):
        chunk = {
            "id": f"{file.filename}-{idx}",
            "content": doc.page_content,
            "page": doc.metadata.get("page", 0),
            "metadata": doc.metadata,
        }
        document_chunks.append(chunk)
    return UploadResponse(
        message="PDF processed and vectorized successfully.",
        filename=file.filename,
        chunks_count=len(documents),
        processing_time=processing_time,
    )


@app.get("/api/documents", response_model=DocumentsResponse)
async def get_documents():
    """Get list of processed documents"""
    return DocumentsResponse(documents=documents_info)


@app.post("/api/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    question = data.get("question")
    chat_history = data.get("chat_history", [])
    if not question:
        return {"error": "Question is required."}

    def answer_stream():
        for chunk in rag_pipeline.stream_answer(question, chat_history):
            yield chunk

    return StreamingResponse(answer_stream(), media_type="text/plain")


@app.get("/api/chunks", response_model=ChunksResponse)
async def get_chunks():
    """Get document chunks (optional endpoint)"""
    return ChunksResponse(chunks=document_chunks, total_count=len(document_chunks))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port, reload=settings.debug)
