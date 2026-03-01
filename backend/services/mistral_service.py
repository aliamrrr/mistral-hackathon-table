import json
from mistralai import Mistral
from backend.core.config import settings

client = Mistral(api_key=settings.mistral_api_key)

SYSTEM_PROMPT = """You are a world-class football tactical AI coach with deep knowledge of spatial positioning on a football pitch.
Your task is to take a natural language description of a football training drill and output a precise JSON schema that governs a 3D tactical animation.

═══════════════════════════════════════════════
PITCH COORDINATE SYSTEM — READ THIS CAREFULLY
═══════════════════════════════════════════════
The pitch is 105 (length/x-axis) x 68 (width/y-axis).

X-AXIS (0 to 105): Runs from LEFT goal line to RIGHT goal line.
  - Left third (defensive):  x = 0  to  x = 35
  - Middle third (midfield): x = 35 to  x = 70
  - Right third (attacking): x = 70 to  x = 105

Y-AXIS (0 to 68): Runs from BOTTOM touchline to TOP touchline.
  - Left flank / wide left:  y = 0  to  y = 22
  - Central corridor:        y = 22 to  y = 46
  - Right flank / wide right:y = 46 to  y = 68

KEY LANDMARK COORDINATES (memorize these):
  - Centre circle:             x=52.5, y=34
  - Left penalty spot:         x=11,   y=34
  - Right penalty spot:        x=94,   y=34
  - Left penalty area:         x=0 to 16.5, y=13.84 to 54.16
  - Right penalty area:        x=88.5 to 105, y=13.84 to 54.16
  - Left post (top):           x=0,   y=30.34
  - Left post (bottom):        x=0,   y=37.66
  - Right post (top):          x=105, y=30.34
  - Right post (bottom):       x=105, y=37.66

SPATIAL RULES — MANDATORY:
  - "Wide left" or "left wing" means y < 20 (near touchline at y=0), NOT y=34.
  - "Wide right" or "right wing" means y > 48 (near touchline at y=68), NOT y=34.
  - "Half-space left" means y between 18 and 26.
  - "Half-space right" means y between 42 and 50.
  - "Central" means y between 28 and 40.
  - Players on the LEFT side of the pitch must have LOWER y values than central players.
  - Players on the RIGHT side of the pitch must have HIGHER y values than central players.
  - NEVER cluster all players around y=34 (centre). Spread them realistically across the full width.
  - A fullback or winger on a flank should be at least 15 units away from y=34 in the appropriate direction.

═══════════════════════════════════════════════
BALL POSITIONING — CRITICAL RULE
═══════════════════════════════════════════════
The ball MUST always be co-located exactly on a player who possesses it, or travelling toward a player who will receive it.

RULE: At the END of every phase where a pass is played, the ball destination coordinates (x, y) in that phase MUST be IDENTICAL to the receiving player coordinates in that SAME phase.

Example of CORRECT ball handoff:
  Phase 3: p3 is at x=60, y=20 — ball b1 must also be at x=60, y=20
  Phase 4: p3 keeps the ball, b1 stays at x=60, y=20 (correct)

Example of WRONG ball handoff — NEVER DO THIS:
  Phase 3: p3 is at x=60, y=20 — ball b1 is at x=58, y=22 (wrong — ball floats near nobody)

PASSING WORKFLOW: When a pass occurs between phase N and phase N+1:
  1. In phase N:   ball is exactly on the passer's (x, y).
  2. In phase N+1: ball destination = receiver's exact (x, y) in that phase.
  3. The receiver MUST move toward where the ball will arrive, not stand still beside it.

═══════════════════════════════════════════════
GROUP & COLOR RULES
═══════════════════════════════════════════════
CRITICAL: Assign groups and colors based ONLY on what the user describes.
  - ONE team or unit doing a movement — use ONE color only (e.g. all "red").
  - TWO opposing groups (attackers vs defenders, pressing vs build-up) — use TWO colors.
  - THREE distinct roles (attackers, defenders, neutral/joker) — use THREE colors.
  - NEVER default to red+blue automatically. Read the prompt carefully.
  - Cones, mannequins, or coaches are not player groups — do not invent phantom groups.

Group naming must be semantic:
  - Good: "build_up", "pressing_unit", "wide_overload", "pivot", "neutral", "striker_run"
  - Never use "team_a" / "team_b" unless the prompt explicitly says so.

═══════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════
Your output MUST be a valid JSON object matching this structure exactly. No markdown, no code fences, raw JSON only.
{
  "metadata": {
    "title": "Short descriptive title",
    "tags": ["Tag1", "Tag2"],
    "intensity": "High/Medium/Low",
    "duration": "Estimated time like 45s"
  },
  "narration": "A coach voiceover explaining what is happening in the drill...",
  "animation": {
    "pitch_size": {"length": 105, "width": 68},
    "entities": {
      "players": [
        {"id": "p1", "group": "pressing", "color": "red", "number": 10},
        {"id": "p2", "group": "build_up", "color": "blue", "number": 4}
      ],
      "balls": [
        {"id": "b1"}
      ]
    },
    "phases": [
      {
        "time_start": 0,
        "time_end": 5,
        "positions": {
          "p1": {"x": 40.5, "y": 15.0},
          "p2": {"x": 45.0, "y": 53.0},
          "b1": {"x": 40.5, "y": 15.0}
        }
      },
      {
        "time_start": 5,
        "time_end": 10,
        "positions": {
          "p1": {"x": 55.0, "y": 15.0},
          "p2": {"x": 60.0, "y": 53.0},
          "b1": {"x": 55.0, "y": 15.0}
        }
      }
    ]
  }
}

═══════════════════════════════════════════════
CRITICAL RULES SUMMARY
═══════════════════════════════════════════════
1. Positions MUST exist for EVERY entity (every player id and every ball id) in EVERY phase without exception.
2. Generate at least 6 to 9 phases to describe meaningful movement arcs. Each phase is a keyframe snapshot.
3. Phases must be strictly contiguous: time_end of phase[N] must equal time_start of phase[N+1].
4. Each phase must have a distinct time_start and time_end (no zero-duration phases).
5. Ball coordinates must EXACTLY match the possessing or receiving player coordinates — no floating ball.
6. Players on wide/flank positions must have y values reflecting their actual side (low y = left, high y = right).
7. Only generate as many color groups as the drill semantically requires — do not invent phantom teams.
"""

# The interpolation script is hardcoded here — never generated by the LLM.
# This eliminates all risk of SyntaxError, hallucinated logic, or broken parentheses.
_DENSE_FRAME_SCRIPT = r"""import sys, json
import numpy as np

def smoothstep(t):
    return t * t * (3.0 - 2.0 * t)

with open(sys.argv[1]) as f:
    drill = json.load(f)

phases = drill["animation"]["phases"]
all_players = drill["animation"]["entities"]["players"]
all_player_ids = [p["id"] for p in all_players]
all_ball_ids = [b["id"] for b in drill["animation"]["entities"]["balls"]]
fps = 60
frames = []
time_cursor = 0.0

for i in range(len(phases) - 1):
    phase_a = phases[i]
    phase_b = phases[i + 1]
    dt = phase_b["time_start"] - phase_a["time_start"]
    if dt <= 0:
        continue
    n_frames = max(1, round(dt * fps))

    for k in range(n_frames):
        t = smoothstep(k / n_frames)

        players = []
        for pid in all_player_ids:
            ax = phase_a["positions"][pid]["x"]
            ay = phase_a["positions"][pid]["y"]
            bx = phase_b["positions"][pid]["x"]
            by = phase_b["positions"][pid]["y"]
            players.append({
                "id": pid,
                "x": float(np.clip(ax + (bx - ax) * t, 0, 105)),
                "y": float(np.clip(ay + (by - ay) * t, 0, 68)),
            })

        balls = []
        for bid in all_ball_ids:
            ax = phase_a["positions"][bid]["x"]
            ay = phase_a["positions"][bid]["y"]
            bx = phase_b["positions"][bid]["x"]
            by = phase_b["positions"][bid]["y"]

            target_x = ax + (bx - ax) * t
            target_y = ay + (by - ay) * t

            if t > 0.8:
                for pid in all_player_ids:
                    px = phase_b["positions"][pid]["x"]
                    py = phase_b["positions"][pid]["y"]
                    dist = ((bx - px) ** 2 + (by - py) ** 2) ** 0.5
                    if dist < 2.0:
                        snap_t = (t - 0.8) / 0.2
                        target_x = target_x + (px - bx) * snap_t
                        target_y = target_y + (py - by) * snap_t
                        break

            balls.append({
                "id": bid,
                "x": float(np.clip(target_x, 0, 105)),
                "y": float(np.clip(target_y, 0, 68)),
            })

        frames.append({
            "time": round(time_cursor, 6),
            "players": players,
            "balls": balls,
        })
        time_cursor += 1.0 / fps

last = phases[-1]

final_players = []
for pid in all_player_ids:
    final_players.append({
        "id": pid,
        "x": float(np.clip(last["positions"][pid]["x"], 0, 105)),
        "y": float(np.clip(last["positions"][pid]["y"], 0, 68)),
    })

final_balls = []
for bid in all_ball_ids:
    bx = last["positions"][bid]["x"]
    by = last["positions"][bid]["y"]
    for pid in all_player_ids:
        px = last["positions"][pid]["x"]
        py = last["positions"][pid]["y"]
        if ((bx - px) ** 2 + (by - py) ** 2) ** 0.5 < 2.0:
            bx, by = px, py
            break
    final_balls.append({
        "id": bid,
        "x": float(np.clip(bx, 0, 105)),
        "y": float(np.clip(by, 0, 68)),
    })

frames.append({
    "time": round(time_cursor, 6),
    "players": final_players,
    "balls": final_balls,
})

drill["animation"]["frames"] = frames
with open(sys.argv[2], "w") as out:
    json.dump(drill, out)
"""


def generate_drill_schema(prompt: str, language: str = "English", context: str = None) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"{prompt}\nIMPORTANT: The narration audio MUST be written exclusively in the following language: {language}"}
    ]

    if context:
        messages[0]["content"] += f"\n\nADDITIONAL COACHING CONTEXT:\n{context}"

    response = client.chat.complete(
        model="mistral-large-2407",
        messages=messages,
        response_format={"type": "json_object"}
    )

    raw_content = response.choices[0].message.content
    try:
        return json.loads(raw_content)
    except json.JSONDecodeError:
        print("Failed to decode JSON:", raw_content)
        raise ValueError("Model output was not valid JSON.")


def generate_video_script(drill_json: dict) -> str:
    """
    Returns the hardcoded 60-FPS interpolation script.
    The drill_json argument is kept for API compatibility but is no longer
    sent to the LLM — the script is always syntactically correct.
    """
    return _DENSE_FRAME_SCRIPT