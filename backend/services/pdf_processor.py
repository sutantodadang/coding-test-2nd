from typing import List, Dict, Any
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from config import settings
import logging
import re
import nltk

logger = logging.getLogger(__name__)

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download(info_or_id="punkt_tab", quiet=True)


class PDFProcessor:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", ". ", "! ", "? ", ", ", " ", ""],
        )

    def extract_text_from_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        logger.info(f"Extracting text from PDF: {file_path}")
        pages_content = []
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                text = re.sub(r"\s+", " ", text)
                table_chunks = self._extract_financial_tables(page)
                pages_content.append(
                    {
                        "page": i + 1,
                        "content": text,
                        "tables": table_chunks,
                        "metadata": {"page": i + 1},
                    }
                )
        logger.info(f"Extracted {len(pages_content)} pages from PDF.")
        return pages_content

    def _split_by_headings(self, text: str) -> List[str]:
        lines = text.split("\n")
        chunks = []
        current_chunk = []
        for line in lines:
            line_stripped = line.strip()
            is_heading = (
                re.match(r"^(\d+\.|[A-Z][A-Z\s\-:]+)$", line_stripped)
                or self._is_financial_heading(line_stripped)
                or (
                    len(line_stripped) > 0
                    and line_stripped.isupper()
                    and len(line_stripped.split()) <= 8
                )
            )

            if is_heading:
                if current_chunk:
                    chunks.append(" ".join(current_chunk).strip())
                    current_chunk = []
                chunks.append(line_stripped)
            else:
                current_chunk.append(line)
        if current_chunk:
            chunks.append(" ".join(current_chunk).strip())
        return [c for c in chunks if c.strip()]

    def split_into_chunks(self, pages_content: List[Dict[str, Any]]) -> List[Document]:
        logger.info("Splitting pages into smarter chunks...")
        documents = []
        for page in pages_content:
            content = page["content"]
            metadata = page.get("metadata", {})
            tables = page.get("tables", [])
            heading_chunks = self._split_by_headings(content)
            heading_indices = []
            for idx, chunk in enumerate(heading_chunks):
                if self._is_financial_heading(chunk):
                    heading_indices.append(idx)
            for table_str in tables:
                doc_metadata = dict(metadata)
                doc_metadata["chunk_type"] = "table"
                context_heading = None
                for idx in reversed(range(len(heading_chunks))):
                    if self._is_financial_heading(heading_chunks[idx]):
                        context_heading = heading_chunks[idx]
                        break
                year = self._extract_year(table_str) or (
                    context_heading and self._extract_year(context_heading)
                )
                metric = self._extract_metric_type(table_str) or (
                    context_heading and self._extract_metric_type(context_heading)
                )
                if year:
                    doc_metadata["year"] = year
                if metric:
                    doc_metadata["metric_type"] = metric
                if context_heading:
                    page_content = f"{context_heading}\n{table_str}"
                else:
                    page_content = table_str
                documents.append(
                    Document(page_content=page_content, metadata=doc_metadata)
                )
            for idx, chunk in enumerate(heading_chunks):
                doc_metadata = dict(metadata)
                doc_metadata["chunk_type"] = "heading"
                doc_metadata["chunk_index"] = idx
                year = self._extract_year(chunk)
                metric = self._extract_metric_type(chunk)
                if year:
                    doc_metadata["year"] = year
                if metric:
                    doc_metadata["metric_type"] = metric
                if len(chunk) > settings.chunk_size * 2:
                    sentences = nltk.sent_tokenize(chunk)
                    temp = []
                    for sent in sentences:
                        temp.append(sent)
                        if sum(len(s) for s in temp) > settings.chunk_size:
                            doc_metadata_sent = dict(doc_metadata)
                            documents.append(
                                Document(
                                    page_content=" ".join(temp),
                                    metadata=doc_metadata_sent,
                                )
                            )
                            temp = []
                    if temp:
                        doc_metadata_sent = dict(doc_metadata)
                        documents.append(
                            Document(
                                page_content=" ".join(temp), metadata=doc_metadata_sent
                            )
                        )
                else:
                    documents.append(
                        Document(page_content=chunk, metadata=doc_metadata)
                    )
        logger.info(f"Total chunks created: {len(documents)}")
        return documents

    def process_pdf(self, file_path: str) -> List[Document]:
        logger.info(f"Starting PDF processing pipeline for: {file_path}")
        pages_content = self.extract_text_from_pdf(file_path)
        documents = self.split_into_chunks(pages_content)
        logger.info(f"PDF processing complete. Total chunks: {len(documents)}")
        return documents

    def _extract_financial_tables(self, page) -> List[str]:
        """Enhanced table extraction specifically for financial data"""
        table_chunks = []
        tables = page.extract_tables() or []

        for table in tables:
            if not table:
                continue

            cleaned_rows = []
            for row in table:
                if not any(row):
                    continue

                cleaned_row = []
                for cell in row:
                    if cell is None:
                        cleaned_row.append("")
                    else:
                        cell_str = str(cell).strip()
                        cell_str = re.sub(r"\$\s+", "$", cell_str)
                        cell_str = re.sub(r"\s+", " ", cell_str)
                        cleaned_row.append(cell_str)
                cleaned_rows.append(cleaned_row)

            if cleaned_rows:
                table_str = []
                headers = cleaned_rows[0] if cleaned_rows else []

                if headers and any(headers):
                    table_str.append("| " + " | ".join(headers) + " |")
                    table_str.append(
                        "|" + "|".join(["-" * (len(h) + 2) for h in headers]) + "|"
                    )

                for row in cleaned_rows[1:]:
                    if any(row):
                        table_str.append("| " + " | ".join(row) + " |")

                if table_str:
                    table_chunks.append("\n".join(table_str))

        return table_chunks

    def _is_financial_heading(self, text: str) -> bool:
        """Identify financial statement headings"""
        financial_headings = [
            "income statement",
            "profit and loss",
            "p&l",
            "balance sheet",
            "statement of financial position",
            "cash flow statement",
            "statement of cash flows",
            "revenue",
            "cost of goods sold",
            "operating expenses",
            "assets",
            "liabilities",
            "equity",
            "shareholders' equity",
            "total revenue",
            "gross profit",
            "operating income",
            "net income",
            "cash and cash equivalents",
        ]

        text_lower = text.lower().strip()
        return any(heading in text_lower for heading in financial_headings)

    def _extract_year(self, text: str) -> str:
        """Extracts a 4-digit year from text, prioritizing 20xx/19xx."""
        match = re.search(r"(20\d{2}|19\d{2})", text)
        return match.group(1) if match else None

    def _extract_metric_type(self, text: str) -> str:
        """Extracts a financial metric type from text if present."""
        metrics = [
            "revenue",
            "operating profit",
            "operating income",
            "net income",
            "gross profit",
            "cash flow",
            "debt",
            "cost of goods sold",
            "expenses",
            "liabilities",
            "assets",
            "equity",
        ]
        text_lower = text.lower()
        for metric in metrics:
            if metric in text_lower:
                return metric
        return None
