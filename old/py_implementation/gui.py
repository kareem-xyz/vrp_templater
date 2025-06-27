import tkinter as tk
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from data_field import template

def draw_centered(draw, text, center, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = center[0] - w / 2
    y = center[1] - h / 2
    draw.text((x, y), text, font=font, fill=fill)

def generate_image():
    name = name_var.get()
    dob = dob_var.get()
    vrp_num = vrp_var.get()
    dr = dr_var.get()

    try:
        img = Image.open(template).convert("RGBA")
    except FileNotFoundError:
        status_label.config(text=f"Template not found: {template}")
        return

    draw = ImageDraw.Draw(img)

    font_name = ImageFont.truetype(font_path, 50)
    font_vrp  = ImageFont.truetype(font_path, 20)
    font_dob  = ImageFont.truetype(font_path, 20)
    font_dr   = ImageFont.truetype(font_path, 30)

    color = "black"

    draw_centered(draw, name,    (550, 335), font_name, color)
    draw_centered(draw, dob,     (550, 380), font_vrp, color)
    draw_centered(draw, vrp_num, (550, 410), font_dob, color)
    draw_centered(draw, dr,      (550, 440), font_dr, color)

    Path("Tests").mkdir(parents=True, exist_ok=True)
    i = 0
    while Path(f"Tests/Image_test_{i}.png").exists():
        i += 1

    out_path = f"Tests/Image_test_{i}.png"
    img.save(out_path)
    status_label.config(text=f"Saved: {out_path}")

# --- Settings ---
template_path = "PatientIDEmpty.png"   # Adjust if your template is elsewhere
font_path = "arial.ttf"                # Adjust to your font file

# --- GUI ---
root = tk.Tk()
root.title("VRP Image Renderer")

name_var = tk.StringVar()
dob_var = tk.StringVar()
vrp_var = tk.StringVar()
dr_var = tk.StringVar()

tk.Label(root, text="Name:").pack()
tk.Entry(root, textvariable=name_var).pack()

tk.Label(root, text="DOB:").pack()
tk.Entry(root, textvariable=dob_var).pack()

tk.Label(root, text="VRP #:").pack()
tk.Entry(root, textvariable=vrp_var).pack()

tk.Label(root, text="Doctor:").pack()
tk.Entry(root, textvariable=dr_var).pack()

tk.Button(root, text="Generate Image", command=generate_image).pack(pady=10)

status_label = tk.Label(root, text="")
status_label.pack()

root.mainloop()
