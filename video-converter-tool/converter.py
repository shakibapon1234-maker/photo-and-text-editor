import os
import sys
import subprocess
import shutil
import re

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
        
    # 3. Check common local installation paths on Windows
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    python_dir = os.path.dirname(sys.executable)
    possible_paths = [
        os.path.join(python_dir, "Lib", "site-packages", "imageio_ffmpeg", "binaries", "ffmpeg-win-x86_64-v7.1.exe"),
        r"C:\ffmpeg\bin\ffmpeg.exe",
        os.path.join(local_appdata, "Programs", "Python", "Python312", "Lib", "site-packages", "imageio_ffmpeg", "binaries", "ffmpeg-win-x86_64-v7.1.exe")
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
            
    return None

PRESETS = {
    "loop_60s": {
        "name": "🔁 Auto-Cut 60-Second Loop Clip (Recommended - 3MB to 5MB)",
        "scale": "1280:-2",
        "crf": "32",
        "remove_audio": True,
        "trim": 60,
        "desc": "Cuts long video to first 60s for seamless, ultra-fast looping presentation background."
    },
    "loop_30s": {
        "name": "⚡ Auto-Cut 30-Second Loop Clip (Ultra Small - 1.5MB to 3MB)",
        "scale": "1280:-2",
        "crf": "32",
        "remove_audio": True,
        "trim": 30,
        "desc": "Cuts first 30 seconds into a tiny, high-performance background loop."
    },
    "loop_120s": {
        "name": "⏱️ Auto-Cut 2-Minute Clip (Extended Loop - 5MB to 8MB)",
        "scale": "1280:-2",
        "crf": "33",
        "remove_audio": True,
        "trim": 120,
        "desc": "Cuts first 2 minutes for longer background sequences."
    },
    "bg_720p_full": {
        "name": "🎬 Full Video HD (No Cut - Compressed 720p)",
        "scale": "1280:-2",
        "crf": "31",
        "remove_audio": True,
        "trim": None,
        "desc": "Keeps entire video length, compressed to 720p."
    },
    "bg_540p": {
        "name": "📱 Ultra Lightweight 540p (Mobile / Low Memory - 1MB to 3MB)",
        "scale": "960:-2",
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

    preset = PRESETS.get(preset_key, PRESETS["loop_60s"])
    trim_val = custom_trim if custom_trim is not None else preset.get("trim")

    target_seconds = float(trim_val) if trim_val and float(trim_val) > 0 else 600.0

    cmd = [
        ffmpeg_exe,
        "-y", # overwrite
    ]

    if trim_val and int(trim_val) > 0:
        cmd.extend(["-ss", "0", "-t", str(trim_val)])

    cmd.extend(["-i", input_path])

    if preset.get("scale"):
        cmd.extend(["-vf", f"scale={preset['scale']}"])

    cmd.extend([
        "-c:v", "libx264",
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
        base, _ = os.path.splitext(inp)
        outp = base + f"_converted_{preset_k}.mp4"
        print(f"Converting: {inp} -> {outp}")
        def cb(pct, line, spd):
            pct_text = f"{pct:.1f}%" if pct is not None else ""
            print(f"Progress: {pct_text} | {spd} | {line}")
        convert_video(inp, outp, preset_k, custom_trim=trim, progress_callback=cb)
        print("Done!")
    else:
        print("Usage: python converter.py <video_path> [preset_key] [trim_seconds]")
