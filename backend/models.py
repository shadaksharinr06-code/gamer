from typing import List, Optional
from pydantic import BaseModel, Field

class DualRAGResponse(BaseModel):
    """
    Structured output schema for the Dual-Response RAG system.
    """
    document_grounded_answer: str = Field(
        ...,
        description="Factual response strictly extracted from the provided document chunks. Must state 'This specific information was not found in the uploaded document.' if not present in context."
    )
    citations: List[str] = Field(
        default_factory=list,
        description="List of citation tags indicating specific source pages or paragraphs, e.g. ['Page 4, Para 2']."
    )
    supplemental_knowledge_answer: str = Field(
        ...,
        description="Broader contextual insights, industry best practices, explanations, or relevant background retrieved from the LLM's broader world knowledge."
    )

class DocumentMetadata(BaseModel):
    id: str
    name: str
    size: int
    type: str
    page_count: int
    chunk_count: int
    uploaded_at: str
    is_scanned_warning: bool = False
    status: str = "ready"

class ChunkItem(BaseModel):
    id: str
    text: str
    page_number: int
    section_or_para: str
    source_file: str
    score: Optional[float] = None

class QueryRequest(BaseModel):
    query: str
    session_id: str
    api_key: Optional[str] = None
    top_k: int = 5

class QueryResponse(BaseModel):
    success: bool
    response: DualRAGResponse
    retrieved_chunks: List[ChunkItem]

class ResetRequest(BaseModel):
    session_id: str
