# DocuDual RAG: Interactive Document Q&A with Dual-Response Outputs

DocuDual RAG is a full-stack web application designed for high-trust document question & answering. For every user inquiry, it delivers two strictly separated response sections:

1. **Direct Document Answer (Zero-Hallucination):** Factual information derived exclusively from the uploaded document, backed by specific page numbers and paragraph citations (e.g. `[Page 4, Para 2]`). If the document does not contain the answer, it explicitly warns the user.
2. **Supplemental / World Knowledge Answer:** Broader contextual insights, industry best practices, real-world analogies, or background theory synthesized from LLM general intelligence.

---

## 🌟 Key Features

- **Multi-Format Ingestion:** Drag-and-drop parsing for **PDF**, **DOCX**, and **TXT** files (up to **25MB**).
- **Page & Section Tracking:** Preserves structural metadata across chunk boundaries.
- **Scanned Document Detection:** Flags image-only or low-density PDFs where OCR is required.
- **Chunking Pipeline:** Recursive character splitting with `chunk_size=1000` and `chunk_overlap=150`.
- **Dual-View UI:** Switch seamlessly between a **Side-by-Side Split Column** view and a **Tabbed** view.
- **Interactive Source Inspector:** Click any citation chip (e.g., `[Page 2, Para 3]`) to inspect the raw context chunk and similarity score.
- **Structured LLM Output:** Single OpenAI `gpt-4o` call enforcing a strict JSON schema to minimize latency and cost.
- **Flexible Architecture:** Run either as a unified **Next.js Full-Stack App** (Route Handlers) or with a decoupled **Python FastAPI** backend.

---

## 📁 Project Architecture

```
dual-rag-doc-qa/
├── app/
│   ├── api/
│   │   ├── upload/route.ts      # Multipart upload, parsing, chunking & vector indexing
│   │   ├── query/route.ts       # Similarity search & structured LLM dual-response
│   │   └── reset/route.ts       # Clears active vector store and session cache
│   ├── globals.css              # Tailwind CSS styles
│   ├── layout.tsx               # Root application layout
│   └── page.tsx                 # Main application page
├── components/
│   ├── DocumentUpload.tsx       # Drag-and-drop zone with progress states & metadata chips
│   ├── DualResponseCard.tsx     # Dual-column & tabbed assistant response renderer
│   ├── ChatInterface.tsx        # Conversation feed, query input & suggested questions
│   └── SourceInspectorModal.tsx # Raw chunk inspector modal with citation highlighting
├── lib/
│   ├── types.ts                 # TypeScript interfaces and data models
│   ├── document-parser.ts       # PDF (pdf-parse), DOCX (mammoth), and TXT text extraction
│   ├── text-splitter.ts         # Recursive splitter (chunk_size=1000, chunk_overlap=150)
│   ├── vector-store.ts          # In-memory vector store with cosine similarity
│   └── prompt-templates.ts      # System prompt and JSON schema formatting
├── backend/                     # (Optional) Decoupled Python FastAPI Backend
│   ├── main.py                  # FastAPI server with CORS & endpoints
│   ├── models.py                # Pydantic schemas (DualRAGResponse, Metadata, Chunks)
│   ├── rag_pipeline.py          # PyPDF / DOCX parsing, LangChain, FAISS & gpt-4o parse
│   └── requirements.txt         # Python dependencies
├── .env.example                 # Environment variables template
├── package.json                 # Next.js scripts and dependencies
├── tailwind.config.js           # Tailwind theme configuration
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 🚀 Quick Start (Next.js Full-Stack Mode)

### 1. Prerequisites
- Node.js 18.x or 20.x
- An OpenAI API Key (or test with the built-in demo synthesizer)

### 2. Setup & Installation
```bash
cd dual-rag-doc-qa
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:
```env
OPENAI_API_KEY=sk-proj-your-key-here
```
*(Note: You can also enter the API key directly through the in-browser UI modal).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐍 Alternative: Decoupled Python (FastAPI) Backend

If you prefer running a dedicated Python service with LangChain and FAISS:

### 1. Set Up Python Environment
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Start FastAPI Server
```bash
export OPENAI_API_KEY=sk-proj-your-key-here
uvicorn main:app --reload --port 8000
```
Interactive API documentation will be available at `http://localhost:8000/docs`.

---

## 🧠 Prompt Engineering & Structured Output Schema

The system uses a single call to `gpt-4o` with a zero-hallucination constraint on Section A and an expansive world knowledge directive on Section B:

```json
{
  "document_grounded_answer": "...",
  "citations": ["Page 4, Para 2"],
  "supplemental_knowledge_answer": "..."
}
```

### Enforcement Rules:
1. **Zero Hallucination:** The `document_grounded_answer` must draw strictly from the retrieved chunks. If the answer cannot be found in the context, it must return:
   `"This specific information was not found in the uploaded document."`
2. **Citation Integrity:** Every claimed fact in `document_grounded_answer` must link to its corresponding `[Page X, Para Y]` chunk.
3. **World Intelligence:** The `supplemental_knowledge_answer` complements the grounded facts with industry standards, related domain knowledge, or comparative insights.
