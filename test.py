import requests
import json  # for getting a structured output with indentation 

response = requests.post(
    "https://api.aimlapi.com/v1/chat/completions",
    headers={
        # Insert your AIML API Key instead of <YOUR_AIMLAPI_KEY>:
        "Authorization":"Bearer b3722afa912d411e824ce57141bbb01a",
        "Content-Type":"application/json"
    },
    json={
        "model":"text-embedding-3-small",
        "messages":[
            {
                "role":"user",
                "content":"Turn this into an embedding - Princess Kaguya"  # insert your prompt here, instead of Hello
            }
        ]
    }
)

data = response.json()
print(json.dumps(data, indent=2, ensure_ascii=False))