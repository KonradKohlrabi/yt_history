# History Video Generator

This project automatically generates history documentary videos in a comic/stickman style. It researches a historical topic, writes a storytelling script from the research, generates audio (TTS), creates character descriptions for image generation, generates word-level timestamps, and splits the story into scenes and frames for later image generation.

**Important: This project is not finished yet.** Some parts of the workflow (e.g. automatically renaming the generated images, the full video export) are not implemented yet or are currently commented out.

---

## Requirements

- Python 3.10 or newer (recommended for WhisperX/Torch compatibility)
- An OpenRouter account with at least one API key (multiple keys are recommended, since the script automatically switches between keys on errors)
- Google Chrome with a running **Google Flow** project (see the "Google Flow Setup" section)
- A Windows/Mac/Linux system with a working screen resolution, since the script simulates real mouse clicks and keyboard input using `pyautogui`
- Optional: An NVIDIA GPU with CUDA for faster transcription with WhisperX (the script automatically falls back to CPU if no GPU is available)

---

## Installation

### 1. Clone the repository

```bash
git clone <REPO_URL>
cd <REPO_FOLDER>
````

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
```

Activate it:

**Windows:**

```bash
venv\Scripts\activate
```

**Mac/Linux:**

```bash
source venv/bin/activate
```

### 3. Install all required libraries at once

Use the following command to install all required packages in one go:

```bash
pip install python-dotenv requests pyautogui edge-tts whisperx torch
```

**Note:** If you want to use a GPU, install the matching CUDA version of PyTorch separately according to the official guide before installing whisperx:

[https://pytorch.org/get-started/locally/](https://pytorch.org/get-started/locally/)

---

## Setting up the `.env` file

A file named `.env` must be created in the project folder. This file contains the OpenRouter API keys, which are used for all AI requests (research, storywriting, characters, scene planning, etc.).

Create the `.env` file with the following content:

```text
OPENROUTER_API_KEY1=your_first_api_key
OPENROUTER_API_KEY2=your_second_api_key
OPENROUTER_API_KEY3=your_third_api_key
OPENROUTER_API_KEY4=your_fourth_api_key
OPENROUTER_API_KEY5=your_fifth_api_key
OPENROUTER_API_KEY6=your_sixth_api_key
```

Not all six keys are required, but the more keys you provide, the more reliable the automatic key-switching becomes in case of errors or rate limits.

You can get API keys at:

[https://openrouter.ai](https://openrouter.ai)

---

# Folder Structure

A folder named `videos` must exist in the root directory, where a subfolder is automatically created for every generated topic.

A `topics.json` file is also required, containing already existing topics as a JSON array.

It can initially be an empty list:

```json
[]
```

---

# Google Flow Setup (IMPORTANT)

The image generation part (`phase_4_character_images`, `prompt_flow`) controls an already opened Chrome instance running Google Flow via simulated mouse clicks and keyboard input.

For this to work correctly, the following must be prepared:

1. Open Google Chrome and log in to Google Flow.
2. Create or open a project in Google Flow.
3. Go to the project settings in Google Flow and make sure that:

   * the entered prompt is not automatically cleared after an image has been generated.
   * the view is set to list view, not the tile/grid view.
4. Position the Chrome window so that it matches exactly the screen coordinates defined in the code:

   * `TEXT_FIELD_COORDS`
   * `ADD_REFERECE_BTN_COORDS`
   * `UPLOAD_COORDS`
   * `BASE_IMG_COORDS`
   * `BTN_1_COORDS`
   * `BTN_2_COORDS`

These coordinates are currently calibrated to a specific screen resolution and window position and must be adjusted in the code if they differ.

Since `pyautogui` simulates real mouse and keyboard input, you must not interact with the mouse or keyboard while this phase is running.

`pyautogui.FAILSAFE` is enabled, meaning the script can be aborted by quickly moving the mouse to the top-left corner of the screen.

---

# Usage

After installation and configuration, the script can simply be started with:

```bash
python main.py
```

The script goes through the following phases:

1. **Topic Generation**

   * A new, not yet used history topic is automatically generated.

2. **Research**

   * Extensive historical information as well as fun facts are researched for the topic.

3. **Storytelling**

   * Based on the researched information, a cinematic documentary script is written.

4. **Characters**

   * All important people in the story are extracted and given detailed image generation prompts.
   * The actual image generation via Google Flow is currently commented out in the code.

5. **Audio**

   * An audio file is generated from the script using text-to-speech (`edge-tts`).

6. **Timeline**

   * Chapter/timeline titles are generated for the documentary.

7. **Timestamps**

   * The audio file is transcribed with WhisperX.
   * Every word in the script is assigned a timestamp.

8. **Scene Planning**

   * The story is divided into individual scenes based on the timestamps and timeline.

9. **Frame Planning**

   * Every scene is split into individual frames for later image generation.

All results:

* story
* research material
* characters
* audio
* scenes
* frames

are automatically saved in the corresponding subfolder of `videos/`.

---

# Known Limitations / Open Points

* The automatic image generation via Google Flow (`prompt_flow`) and the image download (`download_zip`) are currently commented out in the main workflow.
* Automatically renaming the downloaded character images is not implemented yet.
* The actual video assembly (combining audio, images, and frames into a finished video) is not part of the script yet.
* The screen coordinates for `pyautogui` are hardcoded and must be adjusted depending on screen resolution and window position.

---

This project is currently under active development.


