import os
import io
from typing import List, Tuple, Dict, Any
from datetime import datetime

from pypdf import PdfReader
import docx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from openai import OpenAI

from models import DualRAGResponse, ChunkItem, DocumentMetadata

SYSTEM_PROMPT = """You are an advanced Dual-Response Document Assistant. You analyze user questions using retrieved excerpts from an uploaded document while simultaneously delivering broader industry or world knowledge.

Your response MUST be a single, valid JSON object matching this schema:
{
  "document_grounded_answer": "...",
  "citations": ["Page X, Para Y"],
  "supplemental_knowledge_answer": "..."
}

CRITICAL RULES FOR "document_grounded_answer" AND "citations":
1. ZERO HALLUCINATION POLICY: The "document_grounded_answer" MUST be derived EXCLUSIVELY and FACTUALLY from the provided Context Chunks. Do not introduce outside facts or assumptions not directly supported by the text.
2. CITATIONS: Include every specific chunk citation that supported the answer, formatted as ["Page X, Para Y"] or ["Page X, Section Y"].
3. UNANSWERABLE FALLBACK: If the provided Context Chunks do NOT contain the answer, or if the question asks for details not present in the document, you MUST output EXACTLY:
   "This specific information was not found in the uploaded document."
   When this happens, set "citations": [] (empty array).

CRITICAL RULES FOR "supplemental_knowledge_answer":
1. Provide rich, expert-level world knowledge, broader industry context, theoretical background, real-world best practices, or relevant comparisons beyond what is in the document.
2. This section is explicitly NOT restricted to the document. It helps the user understand the wider domain, common pitfalls, or strategic implications.
3. Keep the tone helpful, professional, and clear."""

class DocumentRAGPipeline:
    def __init__(self, session_id: str, api_key: str = None):
        self.session_id = session_id
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.vector_store: FAISS = None
        self.chunks: List[ChunkItem] = []
        self.metadata: DocumentMetadata = None

    def parse_document(self, file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], int, bool]:
        ext = filename.split(".")[-1].lower()
        pages = []
        is_scanned_warning = False

        if ext == "pdf":
            reader = PdfReader(io.BytesIO(file_bytes))
            total_pages = len(reader.pages)
            total_chars = 0
            for p_idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                total_chars += len(text.strip())
                pages.append({"page_number": p_idx + 1, "text": text.strip()})
            if total_chars < 50:
                is_scanned_warning = True

        elif ext == "docx":
            doc = docx.Document(io.BytesIO(file_bytes))
            full_text = "\n\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            paragraphs = full_text.split("\n\n")
            # Page approximation for docx (approx 2500 chars/page)
            curr_page = 1
            buffer = []
            curr_len = 0
            for para in paragraphs:
                if curr_len + len(para) > 2500 and buffer:
                    pages.append({"page_number": curr_page, "text": "\n\n".join(buffer)})
                    curr_page += 1
                    buffer = [para]
                    curr_len = len(para)
                else:
                    buffer.append(para)
                    curr_len += len(para)
            if buffer:
                pages.append({"page_number": curr_page, "text": "\n\n".join(buffer)})
            total_pages = len(pages) or 1
            if len(full_text.strip()) < 30:
                is_scanned_warning = True

        elif ext == "txt":
            raw_text = file_bytes.decode("utf-8", errors="ignore")
            sections = raw_text.split("\n\n")
            curr_page = 1
            buffer = []
            curr_len = 0
            for sec in sections:
                if curr_len + len(sec) > 2000 and buffer:
                    pages.append({"page_number": curr_page, "text": "\n\n".join(buffer)})
                    curr_page += 1
                    buffer = [sec]
                    curr_len = len(sec)
                else:
                    buffer.append(sec)
                    curr_len += len(sec)
            if buffer:
                pages.append({"page_number": curr_page, "text": "\n\n".join(buffer)})
            total_pages = len(pages) or 1
            if len(raw_text.strip()) < 20:
                is_scanned_warning = True

        else:
            raise ValueError(f"Unsupported format: .{ext}")

        return pages, total_pages, is_scanned_warning

    def chunk_and_index(self, file_bytes: bytes, filename: str) -> DocumentMetadata:
        pages, total_pages, is_scanned = self.parse_document(file_bytes, filename)
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        chunk_items: List[ChunkItem] = []
        texts: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        chk_count = 1
        for page in pages:
            page_text = page["text"]
            if not page_text:
                continue
            paras = page_text.split("\n\n")
            for p_idx, para in enumerate(paras):
                sub_chunks = splitter.split_text(para)
                for s_idx, chk in enumerate(sub_chunks):
                    label = f"Para {p_idx + 1}" + (f" (Part {s_idx + 1})" if len(sub_chunks) > 1 else "")
                    chk_id = f"chk_{chk_count}"
                    chunk_items.append(
                        ChunkItem(
                            id=chk_id,
                            text=chk,
                            page_number=page["page_number"],
                            section_or_para=label,
                            source_file=filename
                        )
                    )
                    texts.append(chk)
                    metadatas.append({
                        "id": chk_id,
                        "page_number": page["page_number"],
                        "section_or_para": label,
                        "source_file": filename
                    })
                    chk_count += 1

        if not texts:
            raise ValueError("No extractable text found in document.")

        # Embedding & FAISS Vector Indexing
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=self.api_key or "sk-dummy"
        )
        self.vector_store = FAISS.from_texts(texts=texts, embedding=embeddings, metadatas=metadatas)
        self.chunks = chunk_items

        self.metadata = DocumentMetadata(
            id=self.session_id,
            name=filename,
            size=len(file_bytes),
            type=filename.split(".")[-1],
            page_count=total_pages,
            chunk_count=len(chunk_items),
            uploaded_at=datetime.utcnow().isoformat(),
            is_scanned_warning=is_scanned,
            status="ready"
        )
        return self.metadata

    def query(self, question: str, top_k: int = 5) -> Tuple[DualRAGResponse, List[ChunkItem]]:
        if not self.vector_store:
            raise ValueError("Document not indexed. Upload a document first.")

        # Similarity search with scores
        docs_and_scores = self.vector_store.similarity_search_with_score(question, k=top_k)
        retrieved_chunks: List[ChunkItem] = []
        context_blocks: List[str] = []

        for idx, (doc, score) in enumerate(docs_and_scores):
            meta = doc.metadata
            chunk_item = ChunkItem(
                id=meta.get("id", f"chk_{idx}"),
                text=doc.page_content,
                page_number=meta.get("page_number", 1),
                section_or_para=meta.get("section_or_para", f"Para {idx+1}"),
                source_file=meta.get("source_file", ""),
                score=round(float(score), 3)
            )
            retrieved_chunks.append(chunk_item)
            context_blocks.append(
                f"--- CONTEXT CHUNK {idx + 1} [Page {chunk_item.page_number}, {chunk_item.section_or_para}] ---\n{doc.page_content}\n"
            )

        context_str = "\n".join(context_blocks)
        user_prompt = f"""USER QUESTION:
"{question}"

DOCUMENT CONTEXT CHUNKS:
{context_str}

Instructions:
Generate the strictly structured JSON output following the system rules:
1. "document_grounded_answer": Factual direct response strictly from chunks (or fallback message if missing).
2. "citations": Array of citation tags corresponding to the chunks used.
3. "supplemental_knowledge_answer": Comprehensive contextual insight and world knowledge."""

        client = OpenAI(api_key=self.api_key)
        completion = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format=DualRAGResponse,
            temperature=0.1
        )

        parsed_response = completion.choices[0].message.parsed
        return parsed_response, retrieved_chunks
