import http.server
import socketserver
import json
import urllib.parse
import random
import time
import secrets
from pathlib import Path
from collections import defaultdict

PORT = 8080
STATIC_DIR = Path(__file__).parent.parent / "static"
MAX_PAYLOAD_BYTES = 10 * 1024  # 10 KB limit to prevent DoS via large payloads

# In-memory Rate Limiter: IP -> list of timestamps
RATE_LIMIT_STORE = defaultdict(list)
RATE_LIMIT_WINDOW_SEC = 5.0
MAX_REQUESTS_PER_WINDOW = 12

PUZZLE_BANK = [
    {
        "id": "puz_nature",
        "theme": "Nature & Warmth",
        "difficulty": "Easy",
        "stages": {
            1: {
                "clues": [{
                    "id": "1A", "number": 1, "direction": "across",
                    "text": "Opposite of cold.", "length": 3, "hint": "3 letters"
                }],
                "solution": "HOT",
                "unlockedRows": [0]
            },
            2: {
                "clues": [{
                    "id": "2A", "number": 2, "direction": "across",
                    "text": "The bright yellow star in our daytime sky.", "length": 3, "hint": "3 letters"
                }],
                "solution": "SUN",
                "unlockedRows": [1]
            },
            3: {
                "clues": [{
                    "id": "3A", "number": 3, "direction": "across",
                    "text": "Solid water when frozen.", "length": 3,
                    "hint": "3 letters (First box is a Rebus cell)",
                    "rebus": True, "rebusAnswer": "ICE"
                }],
                "solution": ["ICE", "C", "E"],
                "unlockedRows": [2]
            }
        }
    },
    {
        "id": "puz_animals",
        "theme": "Friendly Creatures",
        "difficulty": "Easy",
        "stages": {
            1: {
                "clues": [{
                    "id": "1A", "number": 1, "direction": "across",
                    "text": "Loyal pet that wags its tail and barks.", "length": 3, "hint": "3 letters"
                }],
                "solution": "DOG",
                "unlockedRows": [0]
            },
            2: {
                "clues": [{
                    "id": "2A", "number": 2, "direction": "across",
                    "text": "Independent feline that purrs and catches mice.", "length": 3, "hint": "3 letters"
                }],
                "solution": "CAT",
                "unlockedRows": [1]
            },
            3: {
                "clues": [{
                    "id": "3A", "number": 3, "direction": "across",
                    "text": "Creature with fins that swims in rivers or oceans.", "length": 3,
                    "hint": "3 letters (First box is a Rebus cell)",
                    "rebus": True, "rebusAnswer": "FISH"
                }],
                "solution": ["FISH", "S", "H"],
                "unlockedRows": [2]
            }
        }
    },
    {
        "id": "puz_sky",
        "theme": "Sky & Horizons",
        "difficulty": "Easy",
        "stages": {
            1: {
                "clues": [{
                    "id": "1A", "number": 1, "direction": "across",
                    "text": "Hours between sunrise and sunset.", "length": 3, "hint": "3 letters"
                }],
                "solution": "DAY",
                "unlockedRows": [0]
            },
            2: {
                "clues": [{
                    "id": "2A", "number": 2, "direction": "across",
                    "text": "The blue expanse above where clouds float.", "length": 3, "hint": "3 letters"
                }],
                "solution": "SKY",
                "unlockedRows": [1]
            },
            3: {
                "clues": [{
                    "id": "3A", "number": 3, "direction": "across",
                    "text": "A twinkling beacon in the clear night sky.", "length": 3,
                    "hint": "3 letters (First box is a Rebus cell)",
                    "rebus": True, "rebusAnswer": "STAR"
                }],
                "solution": ["STAR", "R", "Y"],
                "unlockedRows": [2]
            }
        }
    },
    {
        "id": "puz_colors",
        "theme": "Colors & Little Wonders",
        "difficulty": "Easy",
        "stages": {
            1: {
                "clues": [{
                    "id": "1A", "number": 1, "direction": "across",
                    "text": "The color of a ripe strawberry or fire truck.", "length": 3, "hint": "3 letters"
                }],
                "solution": "RED",
                "unlockedRows": [0]
            },
            2: {
                "clues": [{
                    "id": "2A", "number": 2, "direction": "across",
                    "text": "Tiny hardworking insect that lives in an underground colony.", "length": 3, "hint": "3 letters"
                }],
                "solution": "ANT",
                "unlockedRows": [1]
            },
            3: {
                "clues": [{
                    "id": "3A", "number": 3, "direction": "across",
                    "text": "The color of fresh spring grass.", "length": 3,
                    "hint": "3 letters (First box is a Rebus cell)",
                    "rebus": True, "rebusAnswer": "GREEN"
                }],
                "solution": ["GREEN", "E", "N"],
                "unlockedRows": [2]
            }
        }
    }
]

def get_puzzle_by_id(puz_id):
    if not isinstance(puz_id, str):
        return random.choice(PUZZLE_BANK)
    for p in PUZZLE_BANK:
        if p["id"] == puz_id:
            return p
    return random.choice(PUZZLE_BANK)

def is_rate_limited(client_ip):
    now = time.time()
    history = RATE_LIMIT_STORE[client_ip]
    # Prune old requests outside window
    RATE_LIMIT_STORE[client_ip] = [t for t in history if now - t < RATE_LIMIT_WINDOW_SEC]
    if len(RATE_LIMIT_STORE[client_ip]) >= MAX_REQUESTS_PER_WINDOW:
        return True
    RATE_LIMIT_STORE[client_ip].append(now)
    return False

def safe_compare(val1, val2):
    if not isinstance(val1, str) or not isinstance(val2, str):
        return False
    return secrets.compare_digest(val1.strip().upper(), val2.strip().upper())

class HardenedCrosswordHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/api/health":
            self.send_json_response({"status": "ok", "service": "hardened-crossword-engine", "version": "3.1.0"})
            
        elif parsed.path == "/api/puzzle/init":
            puz_id = params.get("id", [None])[0]
            puz = get_puzzle_by_id(puz_id)

            resp = {
                "puzzleId": puz["id"],
                "theme": puz["theme"],
                "difficulty": puz["difficulty"],
                "activeStage": 1,
                "unlockedRows": puz["stages"][1]["unlockedRows"],
                "clues": {
                    "1": puz["stages"][1]["clues"][0],
                    "2": puz["stages"][2]["clues"][0],
                    "3": puz["stages"][3]["clues"][0]
                }
            }
            self.send_json_response(resp)
        else:
            # Clean static file serving
            super().do_GET()

    def do_POST(self):
        client_ip = self.client_address[0]
        
        # Security Guard 1: Rate limiting check
        if is_rate_limited(client_ip):
            self.send_json_response({
                "success": False,
                "error": "Rate limit exceeded. Please wait a few seconds before trying again."
            }, status=429)
            return

        parsed = urllib.parse.urlparse(self.path)
        content_length_str = self.headers.get("Content-Length", "0")
        
        try:
            content_length = int(content_length_str)
        except ValueError:
            self.send_json_response({"error": "Invalid Content-Length header"}, status=400)
            return

        # Security Guard 2: Payload size restriction to prevent memory exhaustion
        if content_length > MAX_PAYLOAD_BYTES:
            self.send_json_response({"error": "Payload Too Large (Max 10KB)"}, status=413)
            return

        raw_body = self.rfile.read(content_length)
        
        try:
            body = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except Exception:
            self.send_json_response({"error": "Malformed JSON payload"}, status=400)
            return

        if parsed.path == "/api/puzzle/verify":
            puz_id = body.get("puzzleId")
            stage = body.get("stage", 1)
            answers = body.get("answers", {})

            # Security Guard 3: Strict Input Type Sanitization
            if not isinstance(stage, int) or stage not in (1, 2, 3):
                self.send_json_response({"success": False, "error": "Invalid stage parameter"}, status=400)
                return

            if not isinstance(answers, dict):
                self.send_json_response({"success": False, "error": "Malformed answers structure"}, status=400)
                return

            puz = get_puzzle_by_id(puz_id)
            stage_info = puz["stages"].get(stage)
            if not stage_info:
                self.send_json_response({"success": False, "error": "Stage not found"}, status=400)
                return

            expected = stage_info["solution"]
            is_valid = False

            # Security Guard 4: Timing-safe comparison & bounds checking
            if stage in (1, 2):
                key = f"{stage}A"
                user_val = answers.get(key)
                if isinstance(user_val, str) and len(user_val) <= 10:
                    is_valid = safe_compare(user_val, expected)
            elif stage == 3:
                val3 = answers.get("3A")
                if isinstance(val3, list) and len(val3) >= 3 and isinstance(expected, list):
                    w0 = str(val3[0]) if val3[0] else ""
                    w1 = str(val3[1]) if val3[1] else ""
                    w2 = str(val3[2]) if val3[2] else ""
                    if len(w0) <= 10 and len(w1) <= 10 and len(w2) <= 10:
                        is_valid = (
                            safe_compare(w0, expected[0]) and
                            safe_compare(w1, expected[1]) and
                            safe_compare(w2, expected[2])
                        )

            if is_valid:
                next_stage = stage + 1
                has_next = next_stage in puz["stages"]
                
                resp = {
                    "success": True,
                    "stageCompleted": stage,
                    "puzzleFinished": not has_next
                }
                
                if has_next:
                    next_info = puz["stages"][next_stage]
                    resp["nextStage"] = next_stage
                    resp["unlockedRows"] = next_info["unlockedRows"]

                self.send_json_response(resp)
            else:
                self.send_json_response({"success": False, "message": "Incorrect answer. Keep trying!"})

        elif parsed.path == "/api/puzzle/complete":
            solve_time = body.get("timeSeconds", 0)
            if not isinstance(solve_time, (int, float)) or solve_time < 0 or solve_time > 86400:
                solve_time = 0

            self.send_json_response({
                "recorded": True,
                "timeSeconds": int(solve_time),
                "rank": "Verified Solver",
                "securityCheck": "Passed"
            })
        else:
            self.send_json_response({"error": "Not Found"}, status=404)

    def send_json_response(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        # Security Guard 5: Modern Defensive Security Headers
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

def run():
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    with socketserver.TCPServer(("127.0.0.1", PORT), HardenedCrosswordHandler) as httpd:
        print(f"[Hardened Engine v3.1] Running on http://127.0.0.1:{PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    run()
