import os
from dotenv import load_dotenv
import random
import json
import time
import requests
import re
import pyautogui
import subprocess
import edge_tts
import asyncio
import whisperx
import torch
import re
from json_repair import repair_json


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

CHROME_COORDS = (917, 1057)
TEXT_FIELD_COORDS = (826, 925)
BTN_1_COORDS = (1820, 157)
BTN_2_COORDS = (1738, 201)
TEXT_LOADING_COORDS = (757, 227)
ADD_REFERECE_BTN_COORDS = (682, 976)
UPLOAD_COORDS = (626, 563)
BASE_IMG_COORDS = (798, 392)

WAITING_TIME = 60

VOICE = "en-US-BrianNeural"

WHISPERX_MODEL = "small" #small, medium, large-v3

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
    - Alexander the Great
    - Genghis Khan and the Mongol Empire
    - The Fall of Constantinople
    - The Fall of the Roman Republic
    - The American Revolution
    - The British Empire
    - Napoleon Bonaparte
    - The French Revolution
    - The Fall of the Roman Empire
    - The Russian Revolution
    - The Cold War
    - World War I The Great War
    - World War II Explained
    - The Industrial Revolution
    - The American Civil War
    - The Ottoman Empire Rise and Fall

    Examples of bad topics:
    - The Cadaver Synod
    - The Battle of Talas
    - A forgotten medieval noble
    - A minor local conflict

    These are the already existing topics that you MUST NOT use again:
""" 

research_prompt = """You are an expert historian.

Your task is to research the following history topic as thoroughly as possible.

The output is NOT a script and NOT a documentary narration.

Instead, create a comprehensive collection of historical information that will later be transformed into a 10–30 minute YouTube documentary.

Requirements:
- Use web search to gather accurate and up-to-date historical information.
- Include as many important details as possible.
- Prefer factual accuracy over storytelling.
- Explain events chronologically.
- Do not intentionally shorten the information.
- Include enough material for a 10-30 minute documentary.

Research should include whenever applicable:

# Background
- Historical context
- Causes
- Political situation
- Economic situation
- Social situation
- Religious situation

# Timeline
- Important dates
- Major events in chronological order

# Important People
For every important person include:
- Full name
- Role
- Goals
- Actions
- Relationships to other people
- Influence on the events

# Locations
- Countries
- Cities
- Regions
- Battlefields
- Important buildings

# Major Events
For every important event explain:
- What happened
- Why it happened
- Who was involved
- Immediate consequences
- Long-term consequences

# Military (if applicable)
- Battles
- Strategies
- Weapons
- Troop movements
- Commanders

# Politics
- Governments
- Alliances
- Laws
- Treaties
- Diplomatic events

# Society
- Daily life
- Culture
- Technology
- Economy
- Religion

# Numbers
Include whenever available:
- Population
- Army sizes
- Casualties
- Economic data
- Distances
- Dates

# Interesting Visual Details
Include details that would help generate documentary images, such as:
- Clothing
- Buildings
- Landscapes
- Vehicles
- Weapons
- Flags
- Symbols
- Architecture

# Consequences
- Immediate consequences
- Long-term historical impact
- Legacy

Formatting:
- Use clear headings.
- Use bullet points where appropriate.
- Be as complete as possible.
- Do NOT write like a narrator.
- Do NOT omit information to keep it short.

Topic: 
"""
research_funfacts_prompt = """You are an expert historian.

Your task is to find interesting, surprising and memorable fun facts about the following historical topic.

Requirements:
- Use web search.
- Return a maximum of 5 fun facts.
- Only include facts that are historically accurate.
- Every fun fact should make the viewer think "I didn't know that."
- Prefer unusual events, strange coincidences, surprising numbers, famous myths (clearly marked as myths), little-known details, or ironic twists.
- Do NOT include facts that are already widely known unless they are genuinely surprising.
- Do NOT invent or exaggerate facts.
- Each fun fact should be between 2 and 6 sentences long and explain why it is interesting.

If there are fewer than 5 genuinely interesting fun facts, return fewer.

If there are no genuinely interesting fun facts, return EXACTLY:

NO_GOOD_FUNFACTS

Do not add any explanation before or after the list.

Topic:
"""
write_story_prompt = """
You are a professional historian and storytelling writer for high-quality YouTube history documentaries.

Your task is to rewrite the following historical material purely from a storytelling perspective.

# Highest Rule

Never change the historical content.

* Do not invent people.
* Do not invent events.
* Do not invent dialogue.
* Do not invent motives or thoughts unless they are historically documented.
* Do not invent timelines or sequences of events.
* Do not invent details.
* Do not omit important information.

You may only:

* improve the order in which information is presented,
* improve the wording,
* increase suspense,
* reveal information earlier or later,
* improve transitions.

The historical content must remain completely accurate.

---

# Tell the story using the following storytelling framework

## 1. Stakes

Immediately establish:

* Who is affected?
* What is at stake?
* Why is the situation extraordinary?
* What would happen if they failed?

The sooner the viewer understands why the event matters, the better.

---

## 2. Big Question

Introduce a central question early.

The viewer should naturally begin wondering how the situation will unfold.

Examples:

* Will the campaign succeed?
* Can the empire survive?
* Why does something completely unexpected happen?
* Will the plan work?

The question must arise naturally from the historical facts.

---

## 3. Head Fake

First build the audience's expectations.

Then reveal the actual historical outcome in a way that feels surprising.

The surprise must never be invented.

Use only historically verified facts.

The revelation should feel completely logical in hindsight.

---

## 4. Rehook

As soon as one question is answered, immediately introduce the next.

Examples:

* But the story was far from over...
* What nobody realized was...
* At that very moment, a new problem emerged.
* But this was only the beginning.
* What happened next changed everything.

The viewer should never feel that the story has already reached its conclusion.

---

# General Writing Style

Write like a high-quality Netflix, BBC, or ARTE documentary.

Not like a textbook.

Not like Wikipedia.

Not like a list of historical facts.

The story should feel like a movie.

Describe situations vividly and cinematically without changing historical facts.

Vary sentence length between short and long sentences.

Reveal important information only when it creates the greatest impact.

Avoid repetition.

Every paragraph should make the viewer curious about the next one.

Build continuous suspense without artificially exaggerating events.

Emphasize cause and effect throughout the story.

Always explain why important decisions were made and what consequences they had.

Use cliffhangers between major sections whenever appropriate.

The viewer should constantly feel compelled to keep watching.

The goal is to make the story feel like a compelling documentary while remaining completely faithful to historical evidence.



# Important

Do not use markdown, it is going to be the script for a documentary narration.
Do not include any headings, bullet points, or lists in the story.
Do not include any direct speeches, there is only one speaker, the narrator.
Write the script in a continuous narrative style.
There should not be titles or chapters, at least you shouldn't write a headline for anything. Instead you can use paragraphs to separate the story into sections.
Remember, the story is going to be read word for word, the narrator will not improvise or add anything, so the story must be complete and self-contained.

---

# Historical Context and Cause-and-Effect

Do not present history as a simple sequence of events.

For every major event, explain whenever possible:

* why it happened,
* which decisions led to it,
* its immediate consequences,
* why it mattered for the events that followed.

Make cause-and-effect relationships clear so the audience understands history as one connected narrative rather than a collection of isolated facts.

---

# Using the Fun Facts

Along with the historical research, you will receive a small list of fun facts.

Only use them if they genuinely improve the story.

A fun fact should:

* fit naturally into the narrative,
* increase suspense,
* explain an unexpected historical connection,
* or make the viewer briefly stop and think, "Wow, I didn't know that."

Never include a fun fact simply because it exists.

If a fun fact interrupts the flow of the story, feels out of place, or adds no value, omit it completely.

If the fun fact list contains the entry "NO_GOOD_FUNFACTS", ignore it entirely.

Fun facts should never interrupt the main narrative.

They should enhance the story, not distract from it.

---

# Selecting Historical Events

The goal is not to provide a complete chronological record of every historical event.

Instead, focus on the events that truly drive the story forward.

Avoid describing every battle, every campaign, or every single year in chronological order.

Smaller battles, military campaigns, or political details may be summarized or omitted if they are not essential to the main narrative.

Instead, focus on:

* major turning points,
* important decisions,
* historical causes,
* significant consequences,
* and events that fundamentally changed the course of history.

Major battles or historically defining conflicts should, of course, be covered in detail whenever they are necessary for understanding the story.

The goal is to create a compelling, cohesive narrative—not a chronological list of historical facts.
""" 
extract_characters_prompt = """You are a historian and visual planning expert for a high-quality history documentary.

Your task is to identify all people who should appear as characters in the visual adaptation of the following historical story.

Create a JSON array containing the people that are necessary to visually represent the story.

Rules:

- Include every historically important person explicitly mentioned in the story.
- Include important people who are not directly mentioned but are necessary for accurately showing important scenes.
- Think like a documentary filmmaker: If a person would naturally appear in a scene, include them.
- Example: If the story describes Franz Ferdinand visiting Sarajevo, include Sophie Chotek because she was present and would appear in the scene.
- Include rulers, leaders, main participants, victims, opponents, commanders, and other important figures.
- Do NOT include random background people, crowds, soldiers without names, or minor individuals with no storytelling importance.
- Do NOT include fictional characters.
- Do NOT include people only because they existed during the same time period.
- Avoid duplicates. Each person should appear only once.

The output must be ONLY valid JSON.

Format:

[
    {
        "name": "Full name of person",
        "id": 0
    },
    {
        "name": "Full name of person",
        "id": 1
    }
]

Start the IDs at 0 and increase them by 1.

Historical story:
"""
character_descriptions_prompt = """
You are a professional historical researcher and AI image prompt writer for a high-quality history documentary.

Your task is to create detailed image generation prompts for every person in the provided JSON list.

You will receive:
1. The complete historical story.
2. A JSON array containing all characters that appear in the documentary.

Your task:
- Add a new key called "prompt" to every character object.
- The value of "prompt" must be a detailed image generation prompt for creating a historically accurate reference image of that person.

Rules:

- Keep the original JSON structure.
- Do not remove or rename any existing keys.
- Return ONLY valid JSON.
- Do not add explanations outside the JSON.

For each person, create a prompt that includes:

# Identity
- Full name
- Historical role or occupation
- Time period
- Relevant country or region

# Appearance
Include:
- Gender
- Approximate age during the events of the story
- Face shape
- Hair color and hairstyle
- Facial hair if applicable
- Eye color if historically known
- Skin tone if historically appropriate
- Body type
- Distinctive physical features

# Clothing
Describe historically accurate clothing:
- Era-specific clothing style
- Colors when historically known
- Materials
- Accessories
- Military uniforms, royal clothing, civilian clothing, or other relevant outfits

# Style
The image should look like:
- Stickmanstyle, exactly like in the referencepicture 
- The background should be white
- The peronality should just look like the referencepicture, but with the outfit, gender, and everything else described above
- Historically accurate
- Suitable as a reference image for future scenes

Important:
- For famous historical figures, use their real documented appearance.
- For people with known portraits or photographs, match their documented appearance.
- If exact appearance details are unknown, create a historically plausible description without inventing unnecessary details.
- Do not make characters look modern.
- Do not include fantasy elements.
- Do not include text, labels, watermarks, or unrealistic features.

The same character must always look identical in future generated scenes, so prioritize clear and consistent visual details.

Example output:

[
    {
        "name": "Franz Ferdinand",
        "id": 0,
        "prompt": "A historically accurate portrait of Archduke Franz Ferdinand of Austria in 1914..."
    }
]

# JSON Formatting Rules (IMPORTANT)
- Never use literal quotation marks (") inside string values, except to open and close the JSON string itself.
- Never write height using foot/inch notation like 5'9" or 6'2". Always use the metric system.
- Instead write height in words, e.g.or "approximately 175 cm".
- Ensure the output is 100% valid JSON that can be parsed with a standard JSON parser.

Story:
"""

additional_img_prompt = "The Image should NOT be just Black and white, even though the background must be white. The face of the person must be white, except if it was explicitly stated above to have a specific color. Do NOT change the head style, it should be exactly like the one in the reference picture. The rest of the person must be colored, and NOT just textured with black and white.Do NOT write any text, only generate ONE person, NOT many views from the same person, or many styles from the same person. Just generate ONE SINGLE PERSON.  The Person must be drawn standing and NOT for example sitting in a throne. The only possibility a person does not have to stand ist when he/she sits in a wheelchair."


timeline_prompt = """
You are a professional documentary editor.

Your task is to divide the following historical story into its major documentary chapters.

The chapters should represent the main parts of the story, not every individual event.

Imagine you are creating the chapter markers for a high-quality history documentary.

Rules:

- Create between 5 and 15 chapters, depending on the story.
- Every chapter should cover one major phase of the historical narrative.
- Do NOT create chapters for minor events.
- Do NOT skip major turning points.
- The chapters should follow the chronological order of the story.
- Every chapter title must contain the relevant year.
- If an exact date is important to the story (for example "28 June 1914"), include the full date instead of only the year.
- Keep chapter titles concise (usually 3–10 words).
- Use title case.
- Write all chapter titles in English.
- Do NOT number the chapters.
- Do NOT add explanations.
- Do NOT use bullet points.
- Return ONLY the chapter titles, one per line.

Good examples:

Assassination in Sarajevo (28 June 1914)
Outbreak of World War I (1914)
Battle of Stalingrad (1942–1943)
The Fall of Berlin (1945)

Bad examples:

The Story Begins
The Next Event
Important Things Happened
Chapter 1

Historical story:
""" 

generate_scenes_prompt = """
You are a professional documentary director and storyboard planner for high-quality history documentaries.

Your task is to convert the following timestamped narration into a visual scene plan.

The narration contains a timestamp after every spoken word.

You will also receive a chronological list of the documentary chapters.

Your job is NOT to generate image prompts.

Instead, generate a JSON file describing how the documentary should be divided into scenes.

The output will later be used by another AI that generates the actual image prompts.

-----------------------------------
GENERAL GOAL
-----------------------------------

Create scenes that maximize viewer understanding and engagement.

A scene consists of 1 to 5 frames.

Whenever possible, introduce information progressively. Do not reveal everything in the first frame if showing it step-by-step improves understanding.

All frames inside a scene must belong to the same visual idea.

Every new frame should only modify or extend the previous image instead of replacing it completely whenever possible.

Example:

Frame 1:
Europe map

Frame 2:
Same map with the Slavic region highlighted

Frame 3:
Same map with a historically accurate Slavic settler added

This is ONE scene with three frames.

Do NOT split these into separate scenes.

-----------------------------------
WHEN TO START A NEW SCENE
-----------------------------------

Start a new scene whenever at least one of these happens:

- The narration switches to a different event.
- A new location becomes important.
- Time jumps.
- The viewer should see something completely different.
- The visual focus changes.
- A new historical concept is introduced.
- A new documentary chapter begins (see Timeline Scenes below).
- The scene becomes too long

A scene may contain between 1 and 5 frames.

A scene may consist of only a single frame if no visual transition is needed.

Most scenes should last between 1 and 8 seconds.

Longer scenes are allowed only when the narration stays focused on the same visual idea and changing the image would not improve the storytelling.

Avoid scenes that remain visually unchanged for too long.

-----------------------------------
TIMELINE SCENES
-----------------------------------

You will receive a chronological list of documentary chapters.

Example:

- Assassination in Sarajevo (1914)
- Beginning of World War I (1914)
- The Western Front
- The End of the War

Every chapter MUST begin with a dedicated timeline scene.

Do NOT skip any chapter.

The timeline scene must always be inserted immediately before the first scene belonging to that chapter.

A timeline scene should:

- last approximately 1-2 seconds,
- contain only one frame,
- show the documentary timeline,
- highlight the current chapter,
- introduce the next section of the documentary.

The narration continues normally while the timeline is shown.

Timeline scenes should not contain any other visual content.

For every timeline scene set:

"timeline": 1

For every normal scene set:

"timeline": 0

-----------------------------------
FRAMES
-----------------------------------

Choose between 1 and 5 frames.

Use more frames when information is gradually introduced.

Examples:

- Maps
- Timelines
- Territory expansion
- Movement
- Lists
- Explanations that benefit from step-by-step visualization

Use fewer frames for simple narration or when nothing visually changes.

Each frame should naturally build upon the previous one whenever possible.

-----------------------------------
TIMESTAMPS
-----------------------------------

Use the timestamps already contained inside the narration.

time_start must be the timestamp of the first spoken word of the scene.

time_end must be the timestamp of the last spoken word of the scene.

Never invent timestamps.

-----------------------------------
PLAN
-----------------------------------

The "plan" field describes what happens visually.

Each entry corresponds to ONE frame.

Keep every entry short.

Good examples:

- Timeline with current chapter highlighted
- Europe map
- Slavic territory highlighted
- Arrow toward Serbia
- Castle exterior
- King sitting on throne
- Guard approaches
- Guard attacks

Bad examples:

- Long image prompts
- Camera descriptions
- Lighting descriptions
- Image generation prompts

-----------------------------------
GOAL
-----------------------------------

Describe in one short sentence what the viewer should understand after watching this scene.

-----------------------------------
TEXT
-----------------------------------

Include only the narration spoken during this scene.

Keep the timestamps inside the text exactly as they appear.

Do not modify or remove timestamps.

-----------------------------------
CHARACTERS
-----------------------------------

List every named character that should visually appear in this scene.

Only include important characters.

Do not include unnamed soldiers, crowds, civilians, servants, guards, etc., unless they are specifically named.

-----------------------------------
ITEMS
-----------------------------------

List reusable visual assets required for this scene.

Examples:

- Timeline
- Europe Map
- Roman Empire Map
- Crown
- Sword
- Tank
- Castle
- Ship
- French Flag

Only include items that should later receive reference images.

-----------------------------------
REASON
-----------------------------------

Briefly explain why the scene was divided this way.

Focus on visual storytelling and viewer understanding.

-----------------------------------
OUTPUT FORMAT
-----------------------------------

Return ONLY valid JSON.

Example:

[
  {
    "id": 0,
    "timeline": 1,
    "time_start": 0.00,
    "time_end": 1.85,
    "text": "...",
    "goal": "Introduce the next chapter.",
    "plan": [
      "Timeline with current chapter highlighted"
    ],
    "frames": 1,
    "characters": [],
    "items": [
      "Timeline"
    ],
    "reason": "Every documentary chapter begins with a timeline scene."
  },
  {
    "id": 1,
    "timeline": 0,
    "time_start": 1.85,
    "time_end": 6.40,
    "text": "...",
    "goal": "...",
    "plan": [
      "...",
      "...",
      "..."
    ],
    "frames": 3,
    "characters": [
      "..."
    ],
    "items": [
      "..."
    ],
    "reason": "..."
  }
]

Do not output anything except the JSON.

Below you will receive:

1. The timestamped narration.
2. The chronological chapter list.
"""

frames_prompt = """
You are a storyboard editor for a high-quality history documentary.

You will receive a JSON file describing documentary scenes.

Your task is to convert every scene into one or more individual frames.

Do NOT generate image prompts.

Do NOT invent new visual ideas.

The visual decisions have already been made in the scene JSON.

Your only task is to split every scene into its individual frames and assign the correct information to each frame.

-----------------------------------
GENERAL RULES
-----------------------------------

Every entry in the "plan" array becomes exactly ONE frame.

Example:

Scene:

{
    "frames": 3,
    "plan": [
        "Europe map",
        "Slavic territory highlighted",
        "Slavic settler added"
    ]
}

becomes

Frame 0:
Europe map

Frame 1:
Slavic territory highlighted

Frame 2:
Slavic settler added

Do not merge frames.

Do not split frames.

-----------------------------------
TIMESTAMPS
-----------------------------------

Use the scene timestamps.

The first frame starts at scene.time_start.

The last frame ends at scene.time_end.

Distribute the remaining timestamps evenly across the frames.

Example:

Scene:
0.00 - 6.00
3 frames

Frame 1:
0.00 - 2.00

Frame 2:
2.00 - 4.00

Frame 3:
4.00 - 6.00

-----------------------------------
TEXT
-----------------------------------

Split the narration approximately evenly across the frames.

Each frame should contain the narration that is spoken while the image is displayed.

Never modify the narration.

Never remove timestamps.

-----------------------------------
CHARACTERS
-----------------------------------

Copy the character list from the scene.

Every frame inside the same scene receives exactly the same character list.

-----------------------------------
ITEMS
-----------------------------------

Copy the item list from the scene.

Every frame inside the same scene receives exactly the same item list.

-----------------------------------
PLAN
-----------------------------------

Each frame receives exactly one plan entry.

Frame 0 → first plan entry

Frame 1 → second plan entry

etc.

-----------------------------------
IDS
-----------------------------------

"id"

Global frame id.

Starts at 0 and increases by one for every frame.

"scene_id"

Copy the scene id.

"id_scene_relative"

Starts at 0 for every new scene.

Example:

Scene 5 with four frames

Frame 0

scene_id = 5

id_scene_relative = 0

Frame 1

scene_id = 5

id_scene_relative = 1

Frame 2

scene_id = 5

id_scene_relative = 2

Frame 3

scene_id = 5

id_scene_relative = 3

-----------------------------------
TIMELINE
-----------------------------------

Copy the timeline value from the scene.

If the scene contains

"timeline": 1

every frame inside that scene also has

"timeline": 1

-----------------------------------
OUTPUT FORMAT
-----------------------------------

Return ONLY valid JSON.

Example:

[
    {
        "id": 0,
        "scene_id": 0,
        "id_scene_relative": 0,
        "timeline": 1,
        "time_start": 0.00,
        "time_end": 2.00,
        "text": "...",
        "items": [
            "Timeline"
        ],
        "characters": [],
        "plan": "Timeline with current chapter highlighted"
    },
    {
        "id": 1,
        "scene_id": 1,
        "id_scene_relative": 0,
        "timeline": 0,
        "time_start": 2.00,
        "time_end": 4.10,
        "text": "...",
        "items": [
            "Europe Map"
        ],
        "characters": [],
        "plan": "Europe map"
    }
]

Do not output anything except the JSON.

Below you will receive the scene JSON.
"""

or_api_key = random.choice(OR_API_KEYS)

or_headers          = {
    "Authorization": f"Bearer {or_api_key}",
    "HTTP-Referer": "transcribepy",
    "X-Title": "yt-shorts",
    "Content-Type": "application/json",
}

def remove_newlines_from_json_text(text):
    text = text.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    
    text = re.sub(r' {2,}', ' ', text)
    
    return text

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
        ]
    }
    research_funfacts_material = call_openrouter(or_data)
    return research_funfacts_material

def write_story(info, funfacts):
    content = write_story_prompt + "Das sind die Infos: " + info + "\n\n\nFunfacts: " + funfacts
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ]
    }
    story = call_openrouter(or_data)
    return story

def save_story_and_info(foldername, story, info, funfacts):
    with open("videos/"+foldername+"/story.txt", "w", encoding="utf-8") as f:
        f.write(story)
    
    with open("videos/"+foldername+"/info.txt", "w", encoding="utf-8") as f:
        f.write(info+"\n\n\nFunfacts: \n"+funfacts)

def extract_characters(story, foldername):
    content = extract_characters_prompt + "\n" + story
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ]
    }
    characters_string = call_openrouter(or_data)
    characters_json = safe_json_parse(characters_string)
    
    with open("videos/"+foldername+"/"+ CHARACTERS_FILE, "w", encoding="utf-8") as f:
        json.dump(characters_json, f, indent=4)

    return characters_json

def get_character_descriptions(characters_json, story, foldername):
    content = character_descriptions_prompt + str(characters_json) + "\nThis is the Story: \n" + story
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ]
    }
    characters_string = call_openrouter(or_data)
    print("Length of story: ", len(characters_string))

    characters_json = safe_json_parse(characters_string)

    
    
    with open("videos/"+foldername+"/"+ CHARACTERS_FILE, "w", encoding="utf-8") as f:
        json.dump(characters_json, f, indent=4)
    return characters_json

def safe_json_parse(text):
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = remove_newlines_from_json_text(text)

    try:
        repaired_text = repair_json(text)
    except Exception as e:
        print(f"json_repair error: {e}")
        repaired_text = text

    try:
        return json.loads(repaired_text)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Problematic area: {repaired_text[max(0, e.pos-100):e.pos+100]}")
        raise

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
        return prompts
    
def click_on_textbox():
    pyautogui.click(TEXT_FIELD_COORDS[0], TEXT_FIELD_COORDS[1])
    time.sleep(1)

def prompt_flow(prompts):
    add_refrence_base_person()
    for prompt in prompts:
        prompt1 = prompt + additional_img_prompt
        pyautogui.hotkey("ctrl", "a")
        pyautogui.press("backspace")
        pyautogui.typewrite(prompt1)
        time.sleep(random.randrange(10, 20)/20)
        pyautogui.press("enter")
        time.sleep(random.randrange(25, 30))

def add_refrence_base_person():
    time.sleep(random.randrange(10, 20)/30)
    pyautogui.moveTo(ADD_REFERECE_BTN_COORDS[0], ADD_REFERECE_BTN_COORDS[1])
    time.sleep(random.randrange(15, 20)/30)
    pyautogui.click(ADD_REFERECE_BTN_COORDS[0], ADD_REFERECE_BTN_COORDS[1])

    time.sleep(random.randrange(10, 20)/30)
    pyautogui.moveTo(UPLOAD_COORDS[0], UPLOAD_COORDS[1])
    time.sleep(random.randrange(15, 20)/30)
    pyautogui.click(UPLOAD_COORDS[0], UPLOAD_COORDS[1])

    time.sleep(random.randrange(10, 20)/30)
    pyautogui.moveTo(BASE_IMG_COORDS[0], BASE_IMG_COORDS[1])
    time.sleep(random.randrange(15, 20)/30)
    pyautogui.click(BASE_IMG_COORDS[0], BASE_IMG_COORDS[1])

def download_zip():
    pyautogui.moveTo(BTN_1_COORDS[0], BTN_1_COORDS[1])
    time.sleep(0.5)
    pyautogui.click(BTN_1_COORDS[0], BTN_1_COORDS[1])
    time.sleep(0.5)
    pyautogui.moveTo(BTN_2_COORDS[0], BTN_2_COORDS[1])
    time.sleep(0.5)
    pyautogui.click(BTN_2_COORDS[0], BTN_2_COORDS[1])

def wait_for_generation(prompts):
    addition_time = len(prompts)*6
    time.sleep(WAITING_TIME + addition_time)

async def tts(text, foldername):
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save("videos/"+ foldername + "/audio.mp3")

def generate_timeline_prompt(story, foldername):
    content = timeline_prompt + "\n\n" + story
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ]
    }
    timeline_img_prompt = call_openrouter(or_data)
    with open("videos/"+foldername+"/timeline_prompt.txt", "w", encoding="utf-8") as f:
        f.write(timeline_img_prompt)
    return timeline_img_prompt



def add_word_timestamps(story_filename, audio_filename):
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = whisperx.load_model(
        WHISPERX_MODEL,
        device,
        compute_type="float16" if device == "cuda" else "int8"
    )

    audio = whisperx.load_audio(audio_filename)

    result = model.transcribe(audio)

    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"],
        device=device
    )

    result = whisperx.align(
        result["segments"],
        model_a,
        metadata,
        audio,
        device
    )

    aligned_words = [
        w for w in result["word_segments"]
        if "start" in w and w["word"].strip()
    ]

    with open(story_filename, "r", encoding="utf-8") as f:
        story = f.read()

    tokens = re.findall(r"\w+|[^\w\s]", story, re.UNICODE)

    output = []
    word_index = 0

    for token in tokens:
        if re.match(r"\w+", token):
            if word_index < len(aligned_words):
                timestamp = aligned_words[word_index]["start"]
                output.append(f"{token}[{timestamp:.2f}]")
                word_index += 1
            else:
                output.append(token)
        else:
            output.append(token)

    final = ""
    for i, token in enumerate(output):
        if i > 0:
            if re.match(r"[.,!?;:)\]\}]", token):
                pass
            elif re.match(r"[\(\[\{]", token):
                final += " "
            else:
                final += " "
        final += token

    with open(story_filename, "w", encoding="utf-8") as f:
        f.write(final)

    return final

def generate_scenes_json(story, foldername, timeline):
    content = generate_scenes_prompt + "\nThis is the Story: \n" + story + "\nThis is the timeline:\n" + timeline
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ]
    }
    scenes_string = call_openrouter(or_data)

    scenes_json = safe_json_parse(scenes_string)
    
    with open("videos/"+foldername+"/"+ "scenes.json", "w", encoding="utf-8") as f:
        json.dump(scenes_json, f, indent=4)
    return scenes_json

def generate_frames_json(story, foldername, scenes):
    content = frames_prompt + "\nThis is the Story: \n" + story + "\nThis is the scenes json:\n" + str(scenes)
    or_data = {
        "model": OR_MODEL,
        "messages": [{
            "role": "user",
            "content": content
        }
        ]
    }
    frames_string = call_openrouter(or_data)
    
    frames_json = safe_json_parse(frames_string)
        
    with open("videos/"+foldername+"/"+ "frames.json", "w", encoding="utf-8") as f:
        json.dump(frames_json, f, indent=4)
    return frames_json


# Phases

def phase_1_topic():
    print("Phase 1")
    existing_topics = get_existing_topics()
    topic = get_topic(existing_topics)
    foldername = create_folder(topic)
    add_to_existing_topics(foldername)
    return foldername

def phase_2_research(topic):
    print("Phase 2")
    research_material = research(topic)
    research_funfacts_material = research_funfacts(topic)
    return research_material, research_funfacts_material

def phase_3_storytelling(info, funfacts):
    print("Phase 3")
    return write_story(info, funfacts)

def phase_4_character_images(story, foldername):
    print("Phase 4")
    characters_json = extract_characters(story, foldername)
    characters_json = get_character_descriptions(characters_json, story, foldername)
    prompts = []
    for character in characters_json:
        prompts.append(character["prompt"])
    open_chrome()
    click_on_textbox()
    prompt_flow(prompts)
    #rename is missing

def phase_5_generate_audio(story, foldername):
    print("Phase 5")
    asyncio.run(tts(story, foldername))

def phase_6_generate_timeline(story, foldername):
    print("Phase 6")
    timeline_prompt = generate_timeline_prompt(story, foldername)
    print("Timeline: " + timeline_prompt)
    return timeline_prompt

def phase_7_generate_timestamps(foldername):
    print("Phase 7")
    timestamped_story = add_word_timestamps("videos/"+foldername+"/story.txt", "videos/"+foldername+"/audio.mp3")
    with open("videos/"+foldername+"/timestamped_story.txt", "w", encoding="utf-8") as f:
        f.write(timestamped_story)
    return timestamped_story

def phase_8_generate_scenes(story, foldername, timeline):
    print("Phase 8")
    return generate_scenes_json(story, foldername, timeline)

def phase_9_generate_frames(story, foldername, scenes):
    print("Phase 9")
    return generate_frames_json(story, foldername, scenes)


def main():
    start_time = time.perf_counter()
    foldername = phase_1_topic()
    research_material, research_funfacts_material = phase_2_research(foldername)
    story = phase_3_storytelling(research_material, research_funfacts_material)
    save_story_and_info(foldername, story, research_material, research_funfacts_material)
    phase_4_character_images(story, foldername)
    phase_5_generate_audio(story, foldername)
    timeline = phase_6_generate_timeline(story, foldername)
    timestamped_story = phase_7_generate_timestamps(foldername)
    scenes = phase_8_generate_scenes(timestamped_story, foldername, timeline)
    frames = generate_frames_json(story, foldername, scenes)

    end_time = time.perf_counter()
    print("Total time: ", end_time - start_time)


if __name__ == "__main__":
    main()