from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from data_field import *

def draw_centered(draw, text, center, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = center[0] - w / 2
    y = center[1] - h / 2
    draw.text((x, y), text, font=font, fill=fill)

# Load your template image
img = Image.open(template).convert("RGBA")

# Create a drawing context
draw = ImageDraw.Draw(img)

# Example font (adjust the path if needed)
font_name = ImageFont.truetype(all_font, 50)
font_vrp  = ImageFont.truetype(all_font, 20)
font_dob  = ImageFont.truetype(all_font, 20)
font_dr   = ImageFont.truetype(all_font, 30)


# Draw new text at the right positions
draw_centered(draw, name,    (550, 335), font_name, color)
draw_centered(draw, dob,     (550, 380), font_vrp, color)
draw_centered(draw, vrp_num, (550, 410), font_dob, color)
draw_centered(draw, dr,      (550, 440), font_dr, color)

# Save the result
i = 0

Path("Tests").mkdir(parents=True, exist_ok=True)

while Path(f"Tests/Image_test_{i}.png").exists():
    i += 1

img.save(f"Tests/Image_test_{i}.png")
