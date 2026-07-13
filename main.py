import os
from dotenv import load_dotenv
import random
import json
import time
import requests
import re
import pyautogui

load_dotenv()

pyautogui.FAILSAFE = True

# Constants

OR_API_KEYS = [os.getenv("OPENROUTER_API_KEY1"),os.getenv("OPENROUTER_API_KEY2"),os.getenv("OPENROUTER_API_KEY3"),os.getenv("OPENROUTER_API_KEY4"),os.getenv("OPENROUTER_API_KEY5"),os.getenv("OPENROUTER_API_KEY6")]
OR_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"
OR_URL = "https://openrouter.ai/api/v1/chat/completions"
OR_MAX_RETRIES = 3
OR_RETRY_DELAY = 5

MAX_TOPIC_LENGHT = 50
TOPICS_FILE = "topics.json"

CHARACTERS_FILE = "characters.json"

PROMPTS_FILE = "frames.json"

CHROME_COORDS = (1187, 1066)
TEXT_FIELD_COORDS = (826, 925)
BTN_1_COORDS = (1820, 157)
BTN_2_COORDS = (1738, 201)
TEXT_LOADING_COORDS = (757, 227)

WAITING_TIME = 60

topic_prompt = """You are creating topics for a YouTube channel about history.

    Your task is to generate ONE topic for a long-form history documentary.

    Requirements:
    - The topic must be about a well-known or widely interesting historical subject.
    - Choose topics that many people have heard of or that are connected to major historical events, famous leaders, civilizations, wars, revolutions, or important discoveries.
    - The topic should have strong storytelling potential and enough information for a 10-30 minute documentary.
    - Prefer famous people, countries, empires, wars, political movements, or major historical events.
    - The topic can focus on lesser-known aspects of famous history, but the main subject itself should be recognizable.
    - Avoid extremely obscure people, unknown battles, minor events, or topics that only historians would know.
    - Avoid topics that require the viewer to already know the subject.
    - Do NOT generate a topic that is similar to one of the existing topics.
    - The topic must be written in English.
    - The topic must contain a maximum of 50 characters.
    - Return ONLY the topic title.
    - Do NOT use quotation marks.
    - Do NOT use bullet points.
    - Do NOT add any explanation or additional text.

    Examples of good topics:
    - The Rise and Fall of Nazi Germany
    - Stalin's Rise to Power
    - The Fall of the Roman Empire
    - The Cold War Explained
    - The French Revolution
    - Napoleon Bonaparte
    - The History of the Soviet Union
    - The Space Race

    Examples of bad topics:
    - The Cadaver Synod
    - The Battle of Talas
    - A forgotten medieval noble
    - A minor local conflict

    These are the already existing topics that you MUST NOT use again:
""" 

research_prompt = "" # Still missing
research_funfacts_prompt = "" # Still missing
write_story_prompt = "" # Still missing
extract_characters_prompt = "" # Still missing
character_descriptions_prompt = "" # Still missing



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
    topics_text = "\n".join(f"- {topic}" for topic in existing_topics)
    content = topic_prompt + "\n" + topics_text
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ],
        "tools": [
            {
            "type": "openrouter:web_search"
            } 
        ]
    }
    topic = call_openrouter(or_data).strip()
    return topic

def get_topic(existing_topics):
    not_found_yet = True
    while not_found_yet:
        topic = generate_new_topic(existing_topics)
        if len(topic) < MAX_TOPIC_LENGHT:
            not_found_yet = False
    return topic

def create_folder(topic):
    foldername = re.sub(r'[\\/*?:"<>|!()]', '', topic).strip()
    try:
        os.mkdir("./videos/"+ foldername)
        print("Folder created successfully: " + foldername)
    except FileExistsError:
        print("Directory already exists")
    except FileNotFoundError:
        print("One or more parent directories do not exist")

    return foldername

def add_to_existing_topics(foldername):
    with open(TOPICS_FILE, "r", encoding="utf-8") as f:
        topics = json.load(f)
    topics.append(foldername)
    with open(TOPICS_FILE, "w", encoding="utf-8") as f:
        json.dump(topics, f, indent=4)

def research(topic):
    content = research_prompt + topic
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ],
        "tools": [
            {
            "type": "openrouter:web_search"
            } 
        ]
    }
    research_material = call_openrouter(or_data)
    return research_material

def research_funfacts(topic):
    content = research_funfacts_prompt + topic
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ],
        "tools": [
            {
            "type": "openrouter:web_search"
            } 
        ]
    }
    research_funfacts_material = call_openrouter(or_data)
    return research_funfacts_material

def write_story(info, funfacts):
    content = write_story_prompt + info + "\n\n\nFunfacts: " + funfacts
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ],
        "tools": [
            {
            "type": "openrouter:web_search"
            } 
        ]
    }
    story = call_openrouter(or_data)
    return story

def extract_characters(story, foldername):
    content = extract_characters_prompt + story
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ]
    }
    characters_string = call_openrouter(or_data)
    characters_json = json.dumps(characters_string)
    
    with open("videos/"+foldername+"/"+ CHARACTERS_FILE, "w") as f:
        json.dump(characters_json, f, indent=4)
    
    return characters_json

def get_character_descriptions(characters_json, story, foldername):
    content = character_descriptions_prompt + characters_json + story
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ],
        "tools": [
            {
            "type": "openrouter:web_search"
            } 
        ]
    }
    characters_string = call_openrouter(or_data)
    characters_json = json.dumps(characters_string)
    
    with open("videos/"+foldername+"/"+ CHARACTERS_FILE, "w") as f:
        json.dump(characters_json, f, indent=4)
    return characters_json

# Flow Funktions
def open_chrome():
    pyautogui.click(CHROME_COORDS[0], CHROME_COORDS[1])
    time.sleep(1)

def get_prompts():
    with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
        prompts_json = json.load(f)
        prompts = []
        for frame in prompts_json:
            prompts.append(frame["prompt"])
        return prompts#
    
def click_on_textbox():
    pyautogui.click(TEXT_FIELD_COORDS[0], TEXT_FIELD_COORDS[1])
    time.sleep(1)

def prompt_flow(prompts):
    for prompt in prompts:
        pyautogui.typewrite(prompt)
        time.sleep(random.randrange(2, 20)/10)
        pyautogui.press("enter")
        time.sleep(random.randrange(2, 20)/10)

def download_zip():
    pyautogui.moveTo(BTN_1_COORDS[0], BTN_1_COORDS[1])
    time.sleep(0.5)
    pyautogui.click(BTN_1_COORDS[0], BTN_1_COORDS[1])
    time.sleep(0.5)
    pyautogui.moveTo(BTN_2_COORDS[0], BTN_2_COORDS[1])
    time.sleep(0.5)
    pyautogui.click(BTN_2_COORDS[0], BTN_2_COORDS[1])



def wait_for_generation(prompts):
    addition_time = len(prompts)*3
    time.sleep(WAITING_TIME + addition_time)


# Phases

def phase_1_topic():
    existing_topics = get_existing_topics()
    topic = get_topic(existing_topics)
    foldername = create_folder(topic)
    add_to_existing_topics(foldername)
    return foldername

def phase_2_research(topic):
    research_material = research(topic)
    research_funfacts_material = research_funfacts(topic)
    return research_material, research_funfacts_material

def phase_3_storytelling(info, funfacts):
    return write_story(info, funfacts)

def phase_4_character_images(story, foldername):
    characters_json = extract_characters(story, foldername)
    characters_json = get_character_descriptions(characters_json, story, foldername)
    prompts = []
    for character in characters_json:
        prompts.append(character["prompt"])
    open_chrome()
    click_on_textbox()
    prompt_flow(prompts)
    wait_for_generation(prompts)
    download_zip()

def main():
    foldername = phase_1_topic()
    research_material, research_funfacts_material = phase_2_research(foldername)
    story = phase_3_storytelling(research_material, research_funfacts_material)


if __name__ == "__main__":
    main()