from gradio_client import Client

try:
    print("Verbinde mit dem Space...")

    client = Client("ideogram-ai/ideogram4")

    print("Generiere Bild...")

    image_path, seed, caption = client.predict(
        prompt="A futuristic city at sunset, ultra detailed",
        mode="Default · 20 steps",
        upsampler="Ideogram (remote)",
        width=1024,
        height=1024,
        seed=0,
        randomize_seed=True,
        api_name="/generate",
    )

    print("\nErfolgreich!")
    print(f"Bild gespeichert unter: {image_path}")
    print(f"Seed: {seed}")
    print(f"Caption: {caption}")

except Exception as e:
    print("\nFehler:")
    print(type(e).__name__)
    print(e)