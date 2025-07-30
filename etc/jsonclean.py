import json
import re
import os

def extract_last_unit(text):
    matches = list(re.finditer(r'\(([^()]*)\)', text))
    if not matches:
        return text, None

    last_match = matches[-1]
    unit = last_match.group(1)

    # Remove the matched parentheses and its content
    start, end = last_match.span()
    cleaned_text = text[:start].rstrip() + text[end:]

    return cleaned_text.strip(), unit

def process_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for lab_name, lab_data in data.items():
        rows = lab_data.get("rows", {})
        names = rows.get("names", [])

        cleaned_names = []
        units = []

        for name in names:
            cleaned_name, unit = extract_last_unit(name)
            cleaned_names.append(cleaned_name)
            units.append(unit)

        rows["names"] = cleaned_names
        rows["units"] = units

    base, ext = os.path.splitext(filepath)
    new_filepath = base + '_processed' + ext

    with open(new_filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    print(f"Processed file saved as: {new_filepath}")

# Replace with your actual file path
process_json_file("templates_json/Available_labs.json")
