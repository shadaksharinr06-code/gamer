import os
import uuid
from typing import Dict
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import QueryRequest, QueryResponse, ResetRequest, DocumentMetadata
from rag_pipeline import DocumentRAGPipeline

load_dotenv()

app = FastAPI(
    title="DocuDual RAG API",
    description="Backend API for Document Question & Answering with Dual-Response outputs",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active session pipelines in memory
pipelines: Dict[str, DocumentRAGPipeline] = {}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "DocuDual RAG FastAPI Service"}

@app.post("/api/upload", response_model=DocumentMetadata)
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form(None),
    api_key: str = Form(None)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format .{ext}. Please upload a PDF, DOCX, or TXT file."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 25MB limit.")

    active_session_id = session_id or str(uuid.uuid4())
    pipeline = DocumentRAGPipeline(session_id=active_session_id, api_key=api_key)

    try:
        metadata = pipeline.chunk_and_index(file_bytes, file.filename)
        pipelines[active_session_id] = pipeline
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/query", response_model=QueryResponse)
async def query_document(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    pipeline = pipelines.get(req.session_id)
    if not pipeline:
        raise HTTPException(
            status_code=404,
            detail="Session not found or expired. Please upload a document first."
        )

    if req.api_key:
        pipeline.api_key = req.api_key

    try:
        response, retrieved_chunks = pipeline.query(req.query, top_k=req.top_k)
        return QueryResponse(
            success=True,
            response=response,
            retrieved_chunks=retrieved_chunks
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.post("/api/reset")
async def reset_session(req: ResetRequest):
    if req.session_id in pipelines:
        del pipelines[req.session_id]
    return {"success": True, "message": f"Session {req.session_id} reset successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
