import os
import requests

API_KEY = os.getenv("AIMLAPI_KEY")  # put your key in an ENV var

url = "https://api.aimlapi.com/v1/embeddings"
headers = {
    "Authorization": f"Bearer b3722afa912d411e824ce57141bbb01a",
    "Content-Type": "application/json"
}
payload = {
    "model": "text-embedding-ada-002",
    "input": "Hello world! Testing embeddings.",
    "encoding_format": "float"  # optional
}

response = requests.post(url, json=payload, headers=headers)
print("Embedding response:", response.json())
