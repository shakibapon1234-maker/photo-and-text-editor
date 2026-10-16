import os
import sys
import subprocess
import shutil
import re
import glob

# Force UTF-8 encoding on standard streams on Windows to prevent UnicodeEncodeError with Bengali filenames
if sys.platform == 'win32':
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def get_ffmpeg_path():
    # 1. Check system PATH
    ffmpeg_cmd = shutil.which("ffmpeg")
    if ffmpeg_cmd:
        return ffmpeg_cmd
    
    # 2. Check imageio_ffmpeg binary
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
        
    # 3. Dynamic search in Python site-packages & standard Windows directories
    python_dir = os.path.dirname(sys.executable)
    search_patterns = [
        os.path.join(python_dir, "Lib", "site-packages", "imageio_ffmpeg", "binaries", "ffmpeg*"),
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe"
    ]
    for pattern in search_patterns:
        matches = glob.glob(pattern)
        for m in matches:
            if os.path.isfile(m) and os.access(m, os.X_OK):
                return m
            
    return None

PRESETS = {
    "loop_60s": {
        "name": "🔁 Auto-Cut 60-Second Loop Clip (Recommended - 3MB to 5MB)",
        "scale": "min(iw\\,1280):-2",
        "crf": "32",
        "remove_audio": True,
        "trim": 60,
        "desc": "Cuts long video to first 60s for seamless, ultra-fast looping presentation background."
    },
    "loop_30s": {
        "name": "⚡ Auto-Cut 30-Second Loop Clip (Ultra Small - 1.5MB to 3MB)",
        "scale": "min(iw\\,1280):-2",
        "crf": "32",
        "remove_audio": True,
        "trim": 30,
        "desc": "Cuts first 30 seconds into a tiny, high-performance background loop."
    },
    "loop_120s": {
        "name": "⏱️ Auto-Cut 2-Minute Clip (Extended Loop - 5MB to 8MB)",
        "scale": "min(iw\\,1280):-2",
        "crf": "33",
        "remove_audio": True,
        "trim": 120,
        "desc": "Cuts first 2 minutes for longer background sequences."
    },
    "bg_720p_full": {
        "name": "🎬 Full Video HD (No Cut - Compressed 720p)",
        "scale": "min(iw\\,1280):-2",
        "crf": "31",
        "remove_audio": True,
        "trim": None,
        "desc": "Keeps entire video length, compressed to 720p."
    },
    "bg_540p": {
        "name": "📱 Ultra Lightweight 540p (Mobile / Low Memory - 1MB to 3MB)",
        "scale": "min(iw\\,960):-2",
        "crf": "34",
        "remove_audio": True,
        "trim": 60,
        "desc": "Ultra compressed 540p resolution trimmed to 60s for low memory devices."
    }
}

def parse_time_seconds(time_str):
    try:
        parts = time_str.split(":")
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    except Exception:
        pass
    return 0.0

def convert_video(input_path, output_path, preset_key="loop_60s", custom_trim=None, progress_callback=None):
    ffmpeg_exe = get_ffmpeg_path()
    if not ffmpeg_exe:
        raise RuntimeError("FFmpeg executable not found! Please install imageio-ffmpeg or ffmpeg.")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Validate preset key strictly against PRESETS dictionary whitelist
    if preset_key not in PRESETS:
        raise ValueError(f"Unknown preset key: '{preset_key}'. Allowed: {list(PRESETS.keys())}")

    preset = PRESETS[preset_key]
    raw_trim = custom_trim if custom_trim is not None else preset.get("trim")

    trim_float = 0.0
    if raw_trim is not None:
        try:
            trim_float = float(raw_trim)
        except (ValueError, TypeError):
            trim_float = 0.0

    target_seconds = trim_float if trim_float > 0 else 600.0

    cmd = [
        ffmpeg_exe,
        "-y", # overwrite
    ]

    if trim_float > 0:
        cmd.extend(["-ss", "0", "-t", str(trim_float)])

    cmd.extend(["-i", input_path])

    if preset.get("scale"):
        cmd.extend(["-vf", f"scale={preset['scale']}"])

    cmd.extend([
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p", # Ensures 100% universal browser and mobile compatibility
        "-crf", str(preset.get("crf", 32)),
        "-preset", "fast",
        "-movflags", "+faststart"
    ])

    if preset.get("remove_audio"):
        cmd.append("-an")
    else:
        cmd.extend(["-c:a", "aac", "-b:a", "128k"])

    cmd.append(output_path)

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        encoding='utf-8',
        errors='replace'
    )

    time_regex = re.compile(r"time=(\d{2}:\d{2}:\d{2}\.\d+)")
    speed_regex = re.compile(r"speed=\s*([\d\.]+x)")

    for line in process.stdout:
        line_str = line.strip()
        time_match = time_regex.search(line_str)
        speed_match = speed_regex.search(line_str)
        
        percent = None
        speed_str = speed_match.group(1) if speed_match else ""

        if time_match:
            current_secs = parse_time_seconds(time_match.group(1))
            if target_seconds > 0:
                percent = min(100.0, (current_secs / target_seconds) * 100.0)

        if progress_callback:
            progress_callback(percent, line_str, speed_str)

    process.wait()
    if process.returncode != 0:
        raise RuntimeError(f"FFmpeg process exited with code {process.returncode}")

    return output_path

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inp = sys.argv[1]
        preset_k = sys.argv[2] if len(sys.argv) > 2 else "loop_60s"
        trim = sys.argv[3] if len(sys.argv) > 3 else None

        if preset_k not in PRESETS:
            print(f"Error: Invalid preset '{preset_k}'. Valid presets: {list(PRESETS.keys())}", file=sys.stderr)
            sys.exit(1)

        base, _ = os.path.splitext(inp)
        outp = base + f"_converted_{preset_k}.mp4"
        print(f"Converting: {inp} -> {outp}")
        last_logged_pct = -5.0
        def cb(pct, line, spd):
            global last_logged_pct
            if pct is not None and (pct - last_logged_pct >= 5.0 or pct >= 100.0):
                last_logged_pct = pct
                print(f"Progress: {pct:.1f}% | {spd}")
        convert_video(inp, outp, preset_k, custom_trim=trim, progress_callback=cb)
        print("Done!")
    else:
        print("Usage: python converter.py <video_path> [preset_key] [trim_seconds]")
