from pathlib import Path 

from dotenv import load_dotenv
from llama_index.core import (
    Settings, 
    SimpleDirectoryReader, 
    StorageContext, 
    VectorStoreIndex, 
    load_index_from_storage
)
from llama_index.core.node_parser import SentenceSplitter 
from llama_index.embeddings.openai import OpenAIEmbedding

THIS_DIR = Path(__file__).resolve().parent
DATA_DIR = THIS_DIR.parents[1] / "data"
PDF_DIR = DATA_DIR

STORAGE_DIR = DATA_DIR / "index_storage"

load_dotenv()

Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=64)

def build_or_load() -> VectorStoreIndex:
    if STORAGE_DIR.exists():
        print(f"Loading existing index from {STORAGE_DIR} ...")
        storage_context = StorageContext.from_defaults(persist_dir=str(STORAGE_DIR))
        return load_index_from_storage(storage_context)

    print(f"No index found. Building from PDFs in {PDF_DIR} ...")
    documents = SimpleDirectoryReader(
        input_dir=str(PDF_DIR),
        required_exts=[".pdf"],    
    ).load_data()
    print(f"Loaded {len(documents)} document page(s).")

    index = VectorStoreIndex.from_documents(documents)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    index.storage_context.persist(persist_dir=str(STORAGE_DIR))
    print(f"Persisted index to {STORAGE_DIR}")
    return index

if __name__ == "__main__":
    index = build_or_load()
    # docstore holds the parsed nodes (chunks) — report how many we ended up with.
    num_chunks = len(index.docstore.docs)
    print(f"Index ready: {num_chunks} chunks.")
