from pathlib import Path

from dotenv import load_dotenv
from llama_index.core import Settings, StorageContext, load_index_from_storage
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding

THIS_DIR = Path(__file__).resolve().parent          # backend/src/rag
STORAGE_DIR = THIS_DIR.parents[1] / "data" / "index_storage"

load_dotenv()  # OPENAI_API_KEY for the query-time embedding

Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=64)

if not STORAGE_DIR.exists():
    raise RuntimeError(
        f"No index at {STORAGE_DIR}. Run `python src/rag/build_index.py` first."
    )
_storage_context = StorageContext.from_defaults(persist_dir=str(STORAGE_DIR))
_index = load_index_from_storage(_storage_context)

async def query_compendium(query: str) -> str:
    """Answer a question from the Alchemy Auto Owner's Codex.

    Uses async vector retrieval over the persisted index and returns the
    synthesized answer as a string.
    """
    query_engine = _index.as_query_engine(use_async=True, similarity_top_k=4)
    res = await query_engine.aquery(query)
    return str(res)