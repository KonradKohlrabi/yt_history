import os
from dotenv import load_dotenv
import random
import json
import time
import requests
import re

load_dotenv()

OR_API_KEYS = [os.getenv("OPENROUTER_API_KEY1"),os.getenv("OPENROUTER_API_KEY2"),os.getenv("OPENROUTER_API_KEY3"),os.getenv("OPENROUTER_API_KEY4"),os.getenv("OPENROUTER_API_KEY5"),os.getenv("OPENROUTER_API_KEY6")]
OR_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"
OR_URL = "https://openrouter.ai/api/v1/chat/completions"
TOPICS_FILE = "topics.json"
OR_MAX_RETRIES = 3
OR_RETRY_DELAY = 5
MAX_TOPIC_LENGHT = 50

topic_prompt = "" # Prompt is still missing



or_api_key = random.choice(OR_API_KEYS)

or_headers          = {
    "Authorization": f"Bearer {or_api_key}",
    "HTTP-Referer": "transcribepy",
    "X-Title": "yt-shorts",
    "Content-Type": "application/json",
}



def get_existing_topics():
    with open(TOPICS_FILE, "r", encoding="utf-8") as f:
        topics = json.load(f)
        return topics


def call_openrouter(payload):
    last_error = None
    for attempt in range(1, OR_MAX_RETRIES + 1):
        try:
            response = requests.post(OR_URL, headers=or_headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            last_error = e
            or_api_key = random.choice(OR_API_KEYS)
            or_headers["Authorization"] = f"Bearer {or_api_key}"
            print(f"  OpenRouter error (attempt {attempt}/{OR_MAX_RETRIES}): {e}")
            if attempt < OR_MAX_RETRIES:
                time.sleep(OR_RETRY_DELAY)
    raise last_error    

def generate_new_topic(existing_topics):
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": topic_prompt+existing_topics
        }
        ],
        "tools": [
            {
            "type": "openrouter:web_search"
            } 
        ]
    }
    topic = call_openrouter(or_data)
    return topic

def get_topic(existing_topics):
    not_found_yet = True
    while not_found_yet:
        topic = generate_new_topic(existing_topics)
        if len(topic) < MAX_TOPIC_LENGHT:
            not_found_yet = False

def create_folder(topic):
    foldername = re.sub(r'[\\/*?:"<>|!()]', '', topic).strip()
    try:
        os.mkdir("./"+ foldername)
        print("Folder created successfully: " + foldername)
    except FileExistsError:
        print("Directory already exists")
    except FileNotFoundError:
        print("One or more parent directories do not exist")

    return foldername

def main():
    existing_topics = get_existing_topics()
    topic = get_topic(existing_topics)
    foldername = create_folder(topic)


