from PIL import Image, ImageDraw

def render_original_logo(size=1024, bg_color=(0, 32, 69, 255), is_transparent=False, is_monochrome=False):
    # Canvas setup
    if is_transparent:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (size, size), bg_color)
        
    high_scale = 4
    hs_size = size * high_scale
    hs_img = Image.new("RGBA", (hs_size, hs_size), (0, 0, 0, 0))
    hs_draw = ImageDraw.Draw(hs_img)
    
    scale = (size / 512.0) * high_scale
    
    if is_monochrome:
        ring_color = (255, 255, 255, 255)
        blue_color = (255, 255, 255, 255)
    else:
        ring_color = (255, 255, 255, 255)
        blue_color = (59, 130, 246, 255) # #3B82F6
        
    # 1. Top Dot: circle cx=240, cy=90, r=24
    dot_cx, dot_cy, dot_r = 240 * scale, 90 * scale, 24 * scale
    hs_draw.ellipse(
        [dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
        fill=blue_color
    )
    
    # 2. Q Ring: circle cx=240, cy=270, r=115, stroke_width=36
    q_cx, q_cy = 240 * scale, 270 * scale
    q_r_outer = (115 + 18) * scale
    q_r_inner = (115 - 18) * scale
    
    hs_draw.ellipse(
        [q_cx - q_r_outer, q_cy - q_r_outer, q_cx + q_r_outer, q_cy + q_r_outer],
        fill=ring_color
    )
    hs_draw.ellipse(
        [q_cx - q_r_inner, q_cy - q_r_inner, q_cx + q_r_inner, q_cy + q_r_inner],
        fill=(0, 0, 0, 0)
    )
    
    # 3. Tail: line from (315, 345) to (375, 405), width=36, round cap
    x1, y1 = 315 * scale, 345 * scale
    x2, y2 = 375 * scale, 405 * scale
    line_w = 36 * scale
    
    hs_draw.line([(x1, y1), (x2, y2)], fill=blue_color, width=int(line_w))
    
    cap_r = line_w / 2.0
    hs_draw.ellipse([x1 - cap_r, y1 - cap_r, x1 + cap_r, y1 + cap_r], fill=blue_color)
    hs_draw.ellipse([x2 - cap_r, y2 - cap_r, x2 + cap_r, y2 + cap_r], fill=blue_color)
    
    resized = hs_img.resize((size, size), Image.Resampling.LANCZOS)
    img.alpha_composite(resized)
    return img

if __name__ == "__main__":
    # 1. App Launcher Icon: Solid dark navy background #002045 (1024x1024 PNG)
    app_icon = render_original_logo(size=1024, bg_color=(0, 32, 69, 255), is_transparent=False)
    app_icon.save("/Users/apple/Projects/Client/IMS-V2/mobile/assets/icon.png", "PNG")
    print("Generated original app launcher icon: mobile/assets/icon.png")
    
    # 2. Splash Screen Logo: REAL 100% Transparent background (1024x1024 PNG)
    splash_logo = render_original_logo(size=1024, is_transparent=True)
    splash_logo.save("/Users/apple/Projects/Client/IMS-V2/mobile/assets/logo.png", "PNG")
    print("Generated original splash screen logo: mobile/assets/logo.png")
    
    # 3. Notification Small Tray Icon: Monochrome White on REAL Transparent background (128x128 PNG)
    notif_icon = render_original_logo(size=128, is_transparent=True, is_monochrome=True)
    notif_icon.save("/Users/apple/Projects/Client/IMS-V2/mobile/android/app/src/main/res/drawable/ic_notification.png", "PNG")
    print("Generated original notification tray icon: mobile/android/app/src/main/res/drawable/ic_notification.png")
