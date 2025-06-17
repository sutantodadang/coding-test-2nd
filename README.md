# RAG-based Financial Statement Q&A System Coding Challenge

## Overview

Full-stack application using **RAG (Retrieval Augmented Generation)** technology:

1. **Next.js** as the frontend framework
2. **FastAPI** as the backend API layer
3. **PDF financial statement document** based intelligent Q&A system
4. **Vector database** for document search and generative AI

Parse and embed the provided **`FinancialStatement_2025_I_AADIpdf.pdf`** file, then build a system where users can ask questions about the financial statement and AI generates answers by retrieving relevant information.

---

## Project Structure

```
coding-test-2nd/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models/              # Data models
│   │   └── schemas.py       # Pydantic schemas
│   ├── services/            # RAG service logic
│   │   ├── pdf_processor.py # PDF processing and chunking
│   │   ├── vector_store.py  # Vector database integration
│   │   └── rag_pipeline.py  # RAG pipeline
│   ├── requirements.txt     # Python dependencies
│   └── config.py           # Configuration file
├── frontend/
│   ├── pages/              # Next.js pages
│   │   ├── index.tsx       # Main page
│   │   └── _app.tsx        # App component
│   ├── components/         # React components
│   │   ├── ChatInterface.tsx
│   │   └── FileUpload.tsx
│   ├── styles/             # CSS files
│   │   └── globals.css     # Global styles
│   ├── package.json        # Node.js dependencies
│   ├── tsconfig.json       # TypeScript configuration
│   ├── next.config.js      # Next.js configuration
│   ├── next-env.d.ts       # Next.js type definitions
│   └── .eslintrc.json      # ESLint configuration
├── data/
│   └── FinancialStatement_2025_I_AADIpdf.pdf
└── README.md
```

---

## Getting Started

### 1. **Environment Setup**

```bash
# Clone repository
git clone <your-repository-url>
cd coding-test-2nd

# Set up Python virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Set up Ollama
download ollama and install 'https://ollama.com'

pull your desired model using 'ollama pull <model_name>'

# Set up Bun
download Bun and install 'https://bun.sh'
```

### 2. **Backend Setup**

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (create .env file)
OLLAMA_SERVER_URL=http://localhost:11434
VECTOR_DB_PATH=./vector_store
PDF_UPLOAD_PATH=../data

# Run server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. **Frontend Setup**

```bash
cd frontend

# Install dependencies
bun install

# Run development server
bun run dev
```

**Note**: If you encounter TypeScript/linting errors:

- Make sure `npm install` completed successfully
- The project includes all necessary configuration files (`tsconfig.json`, `.eslintrc.json`, `next-env.d.ts`)
- Check that all dependencies are properly installed in `node_modules`

### 4. **Initial Data Processing**

```bash
# Process and vectorize PDF file via API
curl -X POST "http://localhost:8000/api/upload" \
     -F "file=@../data/FinancialStatement_2025_I_AADIpdf.pdf"
```

---

## API Endpoints

### **POST /api/upload**

Upload PDF file and store in vector database

```json
{
  "file": "multipart/form-data"
}
```

### **POST /api/chat**

Generate RAG-based answer to question

```json
{
  "question": "What is the total revenue for 2025?",
  "chat_history": [] // optional
}
```

Response:

```json
{
  "answer": "The total revenue for 2025 is 123.4 billion won...",
  "sources": [
    {
      "content": "Related document chunk content",
      "page": 1,
      "score": 0.85
    }
  ],
  "processing_time": 2.3
}
```

### **GET /api/documents**

Retrieve processed document information

```json
{
  "documents": [
    {
      "filename": "FinancialStatement_2025_I_AADIpdf.pdf",
      "upload_date": "2024-01-15T10:30:00Z",
      "chunks_count": 125,
      "status": "processed"
    }
  ]
}
```

---

## Sample Questions

System should be able to handle questions like these about the financial statement PDF:

- "What is the total revenue for 2025?"
- "What is the year-over-year operating profit growth rate?"
- "What are the main cost items?"
- "How is the cash flow situation?"
- "What is the debt ratio?"

---

## Troubleshooting

### Common Issues

**Frontend TypeScript Errors**:

- Ensure `bun install` was completed successfully
- Check that `node_modules` directory exists and is populated
- Verify all configuration files are present

**Backend Import Errors**:

- Activate Python virtual environment
- Install all requirements: `pip install -r requirements.txt`
- Check Python path and module imports
- Using Python 3.11 version

**CORS Issues**:

- Ensure backend CORS settings allow frontend origin
- Check that API endpoints are accessible from frontend

---

**Build a smarter document Q&A system with RAG technology!**
