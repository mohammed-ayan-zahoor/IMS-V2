from PIL import Image

def process_exact_images():
    icon_path = "/Users/apple/.gemini/antigravity/brain/0cc91d49-2217-4945-af95-33b36b32abf0/quantech_icon_square_1785406659416.jpg"
    splash_path = "/Users/apple/.gemini/antigravity/brain/0cc91d49-2217-4945-af95-33b36b32abf0/quantech_splash_logo_1785406691233.jpg"
    notif_path = "/Users/apple/.gemini/antigravity/brain/0cc91d49-2217-4945-af95-33b36b32abf0/quantech_notification_icon_1785406714376.jpg"

    # 1. App Icon: Direct save to assets/icon.png
    img_icon = Image.open(icon_path).convert("RGB")
    img_icon.save("/Users/apple/Projects/Client/IMS-V2/mobile/assets/icon.png", "PNG")
    print("1. Saved app launcher icon to mobile/assets/icon.png")

    # 2. Splash Logo: Strip checkerboard bg to TRUE alpha transparency
    img_splash = Image.open(splash_path).convert("RGBA")
    datas = img_splash.getdata()
    new_data = []
    
    # Strip checkerboard (grey/white squares around center logo)
    # The logo itself has white Q ring (255, 255, 255) and blue cap (around 59, 130, 246)
    for item in datas:
        r, g, b, a = item
        # Checkerboard colors are light grey ~200-240 and white ~255 with slight tint
        # Blue cap has r < 100, g > 100, b > 200
        # White Q has r > 240, g > 240, b > 240
        # The fake checkerboard pixels are alternating light grey (r,g,b ~204) and near-white (r,g,b ~229)
        if (abs(r - g) < 10 and abs(g - b) < 10 and 180 <= r <= 245):
            new_data.append((0, 0, 0, 0)) # Transparent
        else:
            new_data.append(item)

    img_splash.putdata(new_data)
    img_splash.save("/Users/apple/Projects/Client/IMS-V2/mobile/assets/logo.png", "PNG")
    print("2. Saved splash logo (bg stripped) to mobile/assets/logo.png")

    # 3. Notification Icon: Strip bg and make logo pure white for Android auto-tinting
    img_notif = Image.open(notif_path).convert("RGBA")
    datas_n = img_notif.getdata()
    notif_data = []

    for item in datas_n:
        r, g, b, a = item
        # If it's the logo symbol (white Q / cap), keep as pure white (255, 255, 255, 255)
        # Otherwise transparent background
        if (r > 200 and g > 200 and b > 200) or (b > r + 30 and g > 100):
            # Check if it's not the background grid
            if not (abs(r - g) < 10 and abs(g - b) < 10 and 180 <= r <= 245):
                notif_data.append((255, 255, 255, 255))
            else:
                notif_data.append((0, 0, 0, 0))
        else:
            notif_data.append((0, 0, 0, 0))

    img_notif.putdata(notif_data)
    img_notif.resize((128, 128), Image.Resampling.LANCZOS).save("/Users/apple/Projects/Client/IMS-V2/mobile/android/app/src/main/res/drawable/ic_notification.png", "PNG")
    print("3. Saved notification icon (pure white transparent cutout) to mobile/android/app/src/main/res/drawable/ic_notification.png")

if __name__ == "__main__":
    process_exact_images()
