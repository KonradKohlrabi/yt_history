import pyautogui
import time


def get_mouse_position():
    print("Move your mouse to the desired position. Press Ctrl+C to stop.")
    try:
        while True:
            x, y = pyautogui.position()
            print(f"Current position: ({x}, {y})", end="\r")
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nDone.")


if __name__ == "__main__":
    get_mouse_position()