import os
import json
import re
import time
from pathlib import Path

from google import genai
from google.genai import types
from google.genai.errors import ClientError
import dotenv

dotenv.load_dotenv()


API_KEY = os.getenv("API_KEY")
client  = genai.Client(api_key=API_KEY)

GEMINI_PROMPT = """Analyze this image. Return ONLY this JSON, no markdown, no explanation:
{"description":"<max 15 words>","is_outdoor":<bool>,"is_real_photo":<bool>,"is_nsfw":<bool>}

Description format (STRICT): [problem noun] + [verb/state] + [location]
- Start with visible problem object: pothole/manhole/garbage/smoke/graffiti/tree/streetlight/sign/water/animal/crack/debris
- Then its visible state: cracking/blocking/overflowing/covering/leaning/missing/spreading/flooding
- Then location: near school/on highway/at intersection/along sidewalk/in park/on road
- No articles (a/an/the), no "there is/are", English only, max 15 words
- Describe ONLY what is physically visible, no abstract words
- If no problem: "clean road no damage visible near area"

Examples:
  pothole cracking asphalt lane near busy intersection
  overflowing garbage bins scattered along residential sidewalk
  fallen tree trunk blocking entire urban road near buildings
  broken streetlight leaning over pedestrian crossing near school
  stray dogs gathered near school gate entrance"""


def analyze_image(image_path: str) -> dict:
    path = Path(image_path)
    mime = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png",  "webp": "image/webp"
    }.get(path.suffix.lstrip(".").lower(), "image/jpeg")

    data = path.read_bytes()

    for attempt in range(3):
        try:
            res  = client.models.generate_content(
                model="gemini-3.1-flash-lite-preview",
                contents=[
                    types.Part.from_bytes(data=data, mime_type=mime),
                    GEMINI_PROMPT,
                ],
            )
            text = res.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                text = text.rsplit("```", 1)[0]
            return json.loads(text)

        except (json.JSONDecodeError, KeyError) as e:
            raw   = res.text.strip()
            match = re.search(r'\{.*?\}', raw, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except Exception:
                    pass
            lines  = raw.split("\n")
            desc   = lines[0].strip() if lines else ""
            result = {"description": desc, "is_outdoor": True, "is_real_photo": True, "is_nsfw": False}
            for line in lines[1:]:
                l = line.strip().lower()
                if "is_outdoor"    in l: result["is_outdoor"]    = "true" in l
                elif "is_real_photo" in l: result["is_real_photo"] = "true" in l
                elif "is_nsfw"       in l: result["is_nsfw"]       = "true" in l
            if result["description"]:
                return result
            return {"error": f"Gemini parse hatasi: {e}"}

        except ClientError as e:
            if "429" in str(e):
                wait = 30 * (attempt + 1)
                time.sleep(wait)
            else:
                return {"error": f"Gemini hatasi: {e}"}

    return {"error": "Kota asildi, daha sonra dene"}


def check_troll(gemini_result: dict) -> dict:
    if "error" in gemini_result:
        return {"passed": False, "reason": gemini_result["error"]}
    if gemini_result.get("is_nsfw", False):
        return {"passed": False, "reason": "NSFW: Uygunsuz icerik tespit edildi"}
    if not gemini_result.get("is_real_photo", True):
        return {"passed": False, "reason": "TROLL: Gercek fotograf degil (screenshot/meme/cizim)"}
    if not gemini_result.get("is_outdoor", True):
        return {"passed": False, "reason": "TROLL: Dis mekan fotografi degil"}
    return {"passed": True}
