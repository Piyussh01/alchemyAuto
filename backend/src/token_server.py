from dotenv import load_dotenv
load_dotenv()

from llama_index.core import Settings 
from llama_index.core.node_parser import SentenceSpitter
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=64)

