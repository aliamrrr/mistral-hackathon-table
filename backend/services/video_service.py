import os
import uuid
import tempfile
import json
import subprocess
import shutil
import matplotlib.pyplot as plt
from moviepy.editor import ImageSequenceClip, AudioFileClip, concatenate_videoclips

def enrich_with_dense_frames(anim_data: dict) -> dict:
    """
    Executes the Mistral AI Coder pipeline to mathematically calculate 60fps dense frames.
    Returns the enriched JSON containing ["animation"]["frames"].
    """
    from backend.services.mistral_service import generate_video_script
    
    try:
        print("Requesting Dense Frame Generation Script from Mistral AI...")
        py_script_code = generate_video_script(anim_data)
    except Exception as e:
        print(f"Failed to generate dense frame script via AI: {e}")
        return anim_data
        
    temp_dir = tempfile.mkdtemp()
    json_in = os.path.join(temp_dir, "in.json")
    json_out = os.path.join(temp_dir, "out.json")
    script_path = os.path.join(temp_dir, "script.py")
    
    with open(json_in, "w", encoding="utf-8") as f:
        json.dump(anim_data, f)
        
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(py_script_code)
        
    print("Spawning subprocess to execute AI-generated math script...")
    process = subprocess.run(
        ["python", script_path, json_in, json_out],
        capture_output=True,
        text=True
    )
    
    if process.returncode != 0:
        print("AI Python Script Execution Failed!")
        print("STDOUT:", process.stdout)
        print("STDERR:", process.stderr)
        return anim_data
        
    if os.path.exists(json_out):
        print("Dense frames calculated successfully!")
        with open(json_out, "r", encoding="utf-8") as f:
            return json.load(f)
            
    return anim_data


def draw_pitch(ax, length, width):
    ax.set_facecolor('#2d5a36')
    ax.set_xlim([-5, length + 5])
    ax.set_ylim([-5, width + 5])
    
    # Pitch Boundaries
    ax.plot([0, length, length, 0, 0], [0, 0, width, width, 0], color="white", linewidth=2, zorder=1)
    
    # Center Line
    ax.plot([length/2, length/2], [0, width], color="white", linewidth=2, zorder=1)
    
    # Center Circle
    center_circle = plt.Circle((length/2, width/2), 9.15, color="white", fill=False, linewidth=2, zorder=1)
    ax.add_artist(center_circle)
    center_dot = plt.Circle((length/2, width/2), 0.6, color="white", zorder=1)
    ax.add_artist(center_dot)
    
    # Penalty Areas (16.5m)
    ax.plot([0, 16.5, 16.5, 0], [width/2 - 20.15, width/2 - 20.15, width/2 + 20.15, width/2 + 20.15], color="white", linewidth=2, zorder=1)
    ax.plot([length, length - 16.5, length - 16.5, length], [width/2 - 20.15, width/2 - 20.15, width/2 + 20.15, width/2 + 20.15], color="white", linewidth=2, zorder=1)
    
    # Goal Areas (5.5m)
    ax.plot([0, 5.5, 5.5, 0], [width/2 - 9.15, width/2 - 9.15, width/2 + 9.15, width/2 + 9.15], color="white", linewidth=2, zorder=1)
    ax.plot([length, length - 5.5, length - 5.5, length], [width/2 - 9.15, width/2 - 9.15, width/2 + 9.15, width/2 + 9.15], color="white", linewidth=2, zorder=1)
    
    # Penalty Dots
    ax.add_artist(plt.Circle((11, width/2), 0.5, color="white", zorder=1))
    ax.add_artist(plt.Circle((length - 11, width/2), 0.5, color="white", zorder=1))
    
    # Arcs
    from matplotlib.patches import Arc
    ax.add_patch(Arc((11, width/2), 18.3, 18.3, theta1=308, theta2=52, color="white", linewidth=2, zorder=1))
    ax.add_patch(Arc((length - 11, width/2), 18.3, 18.3, theta1=128, theta2=232, color="white", linewidth=2, zorder=1))


def generate_video(anim_data: dict, audio_url: str = "", fps: int = 60) -> str:
    """
    Generates an MP4 purely by rendering the AI-computed dense frames array.
    fps MUST match the rate at which dense frames were generated (default 60).
    """
    os.makedirs("backend/static/videos", exist_ok=True)
    video_id = str(uuid.uuid4())[:8]
    output_path = f"backend/static/videos/export_{video_id}.mp4"
    
    # Robust extraction: handle both full drill dict or just the animation sub-object
    animation = anim_data.get("animation", anim_data)
    
    pitch_len = animation["pitch_size"]["length"]
    pitch_wid = animation["pitch_size"]["width"]
    frames = animation.get("frames", [])
    
    if not frames:
        print("No dense frames found in anim_data! Cannot render video.")
        return ""
    
    # Use a persistent temp dir — don't clean it until AFTER write_videofile
    frames_dir = tempfile.mkdtemp()
    frame_files = []
    
    entities_players_map = {
        p["id"]: p 
        for p in animation.get("entities", {}).get("players", [])
    }
    
    print(f"Rendering {len(frames)} frames at {fps}fps...")

    for frame_idx, frame in enumerate(frames):
        fig, ax = plt.subplots(figsize=(12, 8), facecolor='#2d5a36')
        draw_pitch(ax, pitch_len, pitch_wid)
        
        # Players
        for player in frame.get("players", []):
            p_id = player.get("id")
            merged_p = {**entities_players_map.get(p_id, {}), **player}
            color = merged_p.get("color", "white")
            x, y = merged_p.get("x", 0), merged_p.get("y", 0)
            circle = plt.Circle((x, y), 1.5, color=color, zorder=10)
            ax.add_artist(circle)
            if "number" in merged_p:
                ax.text(
                    x, y, str(merged_p["number"]),
                    color="white", fontsize=8,
                    ha="center", va="center", zorder=11
                )
        
        # Balls & Trails
        for ball in frame.get("balls", []):
            x, y = ball.get("x", 0), ball.get("y", 0)
            trail_x, trail_y = [], []
            # Only look back up to 15 frames for trail (perf + visual quality)
            lookback = frames[max(0, frame_idx - 15):frame_idx + 1]
            for past_f in lookback:
                for past_b in past_f.get("balls", []):
                    if past_b.get("id") == ball.get("id"):
                        trail_x.append(past_b.get("x", 0))
                        trail_y.append(past_b.get("y", 0))
            if len(trail_x) > 1:
                ax.plot(
                    trail_x, trail_y,
                    color='yellow', linestyle='--', linewidth=2, zorder=5
                )
            circle = plt.Circle((x, y), 0.8, color="white", zorder=10)
            ax.add_artist(circle)
        
        ax.set_aspect('equal')
        plt.axis('off')
        
        frame_path = os.path.join(frames_dir, f"frame_{frame_idx:05d}.png")
        plt.savefig(frame_path, bbox_inches='tight', pad_inches=0.1, dpi=100, facecolor=fig.get_facecolor())
        plt.close(fig)
        frame_files.append(frame_path)
    
    print(f"All {len(frame_files)} frames rendered. Compositing video...")

    # --- FIX 1: fps must match dense frame generation rate ---
    clip = ImageSequenceClip(frame_files, fps=fps)

    # --- FIX 2: Resolve audio BEFORE write_videofile, use dedicated temp path ---
    audio_clip = None
    if audio_url:
        # Support both "/static/audio/..." and absolute paths
        if audio_url.startswith("/static/audio/"):
            audio_path = os.path.join("backend", audio_url.lstrip("/"))
        else:
            audio_path = audio_url
        
        if os.path.exists(audio_path):
            print(f"Loading audio from: {audio_path}")
            audio_clip = AudioFileClip(audio_path)
            
            # Loop video to match audio length if needed
            if audio_clip.duration > clip.duration:
                loops = int(audio_clip.duration / clip.duration) + 1
                clip = concatenate_videoclips([clip] * loops).subclip(0, audio_clip.duration)
            
            # Trim audio if it's longer than the video
            if audio_clip.duration > clip.duration:
                audio_clip = audio_clip.subclip(0, clip.duration)
            
            # Set audio on clip — this is what actually mixes it in
            clip = clip.set_audio(audio_clip)
            print("Audio attached successfully.")
        else:
            print(f"WARNING: Audio file not found at '{audio_path}' — skipping audio.")

    # Dedicated temp audio file INSIDE frames_dir (guaranteed to exist)
    temp_audio_path = os.path.join(frames_dir, "temp_audio_mix.m4a")

    clip.write_videofile(
        output_path,
        fps=fps,
        codec='libx264',
        audio_codec='aac',
        temp_audiofile=temp_audio_path,
        remove_temp=True,
        logger=None,
        # Ensure audio is written even if short
        audio=True if audio_clip else False,
    )

    # Cleanup AFTER write_videofile has finished
    if audio_clip:
        audio_clip.close()
    clip.close()

    for f in frame_files:
        try:
            os.remove(f)
        except Exception:
            pass
    shutil.rmtree(frames_dir, ignore_errors=True)

    print(f"Video exported: /static/videos/export_{video_id}.mp4")
    return f"/static/videos/export_{video_id}.mp4"