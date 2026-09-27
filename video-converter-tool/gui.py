import os
import sys
import threading
import subprocess
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

# Ensure current directory is on python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from converter import PRESETS, convert_video, get_ffmpeg_path

class VideoConverterGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🎬 Photo & Presentation Video Converter Tool")
        self.root.geometry("720x660")
        self.root.resizable(False, False)
        self.root.configure(bg="#1e1e2e")

        self.input_file = tk.StringVar()
        self.output_file = tk.StringVar()
        self.selected_preset = tk.StringVar(value="loop_60s")
        self.trim_option = tk.StringVar(value="auto") # auto, 30, 60, 120, full
        self.is_converting = False
        self.spin_idx = 0
        self.spin_symbols = ["◐", "◓", "◑", "◒", "🔄", "⚡", "✨"]

        self._setup_ui()
        self._check_ffmpeg()

    def _setup_ui(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TProgressbar", thickness=20, troughcolor="#2a2a3c", background="#a6e3a1")

        # Header
        header_frame = tk.Frame(self.root, bg="#252538", pady=12, padx=20)
        header_frame.pack(fill="x")

        title = tk.Label(
            header_frame,
            text="🎬 Auto-Trim & Presentation Video Converter",
            font=("Segoe UI", 15, "bold"),
            fg="#ffffff",
            bg="#252538"
        )
        title.pack(anchor="w")

        subtitle = tk.Label(
            header_frame,
            text="আধা ঘন্টা বা যেকোনো বড় ভিডিও অটোমেটিক কেটে ৬০ সেকেণ্ড ব্যাকগ্রাউন্ড লুপ করুন",
            font=("Segoe UI", 9),
            fg="#a6adc8",
            bg="#252538"
        )
        subtitle.pack(anchor="w", pady=(2, 0))

        # Main Body
        body_frame = tk.Frame(self.root, bg="#1e1e2e", padx=20, pady=10)
        body_frame.pack(fill="both", expand=True)

        # 1. Input File Select Section
        file_label = tk.Label(
            body_frame,
            text="📁 Select Source Video (উৎস ভিডিও ফাইল সিলেক্ট করুন):",
            font=("Segoe UI", 9, "bold"),
            fg="#cdd6f4",
            bg="#1e1e2e"
        )
        file_label.pack(anchor="w")

        file_row = tk.Frame(body_frame, bg="#1e1e2e")
        file_row.pack(fill="x", pady=(3, 8))

        file_entry = tk.Entry(
            file_row,
            textvariable=self.input_file,
            font=("Segoe UI", 9),
            bg="#313244",
            fg="#ffffff",
            insertbackground="#ffffff",
            relief="flat"
        )
        file_entry.pack(side="left", fill="x", expand=True, ipady=4, padx=8)

        browse_btn = tk.Button(
            file_row,
            text="Browse Source...",
            font=("Segoe UI", 9, "bold"),
            bg="#89b4fa",
            fg="#11111b",
            activebackground="#b4befe",
            relief="flat",
            padx=10,
            command=self.browse_input_file
        )
        browse_btn.pack(side="right")

        # 2. Output File Save Location & Name
        out_label = tk.Label(
            body_frame,
            text="💾 Save Location & Output Name (কোথায় ও কী নামে সেভ করবেন):",
            font=("Segoe UI", 9, "bold"),
            fg="#cdd6f4",
            bg="#1e1e2e"
        )
        out_label.pack(anchor="w")

        out_row = tk.Frame(body_frame, bg="#1e1e2e")
        out_row.pack(fill="x", pady=(3, 8))

        out_entry = tk.Entry(
            out_row,
            textvariable=self.output_file,
            font=("Segoe UI", 9),
            bg="#313244",
            fg="#a6e3a1",
            insertbackground="#ffffff",
            relief="flat"
        )
        out_entry.pack(side="left", fill="x", expand=True, ipady=4, padx=8)

        out_browse_btn = tk.Button(
            out_row,
            text="Choose Save Path...",
            font=("Segoe UI", 9, "bold"),
            bg="#f9e2af",
            fg="#11111b",
            activebackground="#f9e2af",
            relief="flat",
            padx=10,
            command=self.browse_output_file
        )
        out_browse_btn.pack(side="right")

        # 3. Preset Selection Section
        preset_label = tk.Label(
            body_frame,
            text="⚡ Select Optimization Preset (ভিডিও অপ্টিমাইজেশন প্রেসেট):",
            font=("Segoe UI", 9, "bold"),
            fg="#cdd6f4",
            bg="#1e1e2e"
        )
        preset_label.pack(anchor="w")

        preset_box = tk.Frame(body_frame, bg="#252538", padx=10, pady=5)
        preset_box.pack(fill="x", pady=(3, 8))

        for key, pinfo in PRESETS.items():
            rb = tk.Radiobutton(
                preset_box,
                text=pinfo["name"],
                value=key,
                variable=self.selected_preset,
                font=("Segoe UI", 8, "bold"),
                fg="#89b4fa",
                bg="#252538",
                activebackground="#252538",
                activeforeground="#a6e3a1",
                selectcolor="#252538",
                command=self.update_default_output_name
            )
            rb.pack(anchor="w")

            desc = tk.Label(
                preset_box,
                text=f"   • {pinfo['desc']}",
                font=("Segoe UI", 8),
                fg="#a6adc8",
                bg="#252538"
            )
            desc.pack(anchor="w", pady=(0, 1))

        # 4. Duration Trim Selector
        trim_label = tk.Label(
            body_frame,
            text="✂️ Auto-Cut Duration Limit (ভিডিও কতটুকু কেটে ব্যাকগ্রাউন্ড রাখবেন):",
            font=("Segoe UI", 9, "bold"),
            fg="#cdd6f4",
            bg="#1e1e2e"
        )
        trim_label.pack(anchor="w")

        trim_row = tk.Frame(body_frame, bg="#1e1e2e")
        trim_row.pack(fill="x", pady=(3, 8))

        trim_options = [
            ("Preset Default", "auto"),
            ("✂️ Cut First 30s", "30"),
            ("🔁 Cut First 60s (Recommended)", "60"),
            ("⏱️ Cut First 2 Mins", "120"),
            ("🎬 Keep Full Video", "full")
        ]

        for text, val in trim_options:
            rb = tk.Radiobutton(
                trim_row,
                text=text,
                value=val,
                variable=self.trim_option,
                font=("Segoe UI", 8, "bold"),
                fg="#fab387",
                bg="#1e1e2e",
                activebackground="#1e1e2e",
                activeforeground="#a6e3a1",
                selectcolor="#1e1e2e",
                command=self.update_default_output_name
            )
            rb.pack(side="left", padx=(0, 6))

        # 5. VISIBLE PROGRESS BAR & STATUS CONTAINER (POSITIONED ABOVE BUTTON)
        progress_box = tk.Frame(body_frame, bg="#252538", padx=12, pady=10)
        progress_box.pack(fill="x", pady=(4, 8))

        progress_lbl_row = tk.Frame(progress_box, bg="#252538")
        progress_lbl_row.pack(fill="x", pady=(0, 4))

        self.status_label = tk.Label(
            progress_lbl_row,
            text="Ready. Select video file and save path to convert.",
            font=("Segoe UI", 9, "bold"),
            fg="#a6e3a1",
            bg="#252538"
        )
        self.status_label.pack(side="left")

        self.progress_bar = ttk.Progressbar(progress_box, mode="determinate", style="TProgressbar", maximum=100)
        self.progress_bar.pack(fill="x")

        # 6. Convert Action Button
        self.convert_btn = tk.Button(
            body_frame,
            text="🚀 AUTO-CUT & COMPRESS VIDEO (ভিডিও কেটে ছোট করুন)",
            font=("Segoe UI", 11, "bold"),
            bg="#a6e3a1",
            fg="#11111b",
            activebackground="#94e2d5",
            relief="flat",
            command=self.start_conversion
        )
        self.convert_btn.pack(fill="x", pady=(4, 6), ipady=6)

    def _check_ffmpeg(self):
        if not get_ffmpeg_path():
            self.status_label.config(
                text="⚠️ Warning: FFmpeg not detected! Please ensure imageio-ffmpeg or ffmpeg is installed.",
                fg="#f38ba8"
            )

    def browse_input_file(self):
        filename = filedialog.askopenfilename(
            title="Select Source Video File",
            filetypes=[("Video Files", "*.mp4 *.mov *.avi *.mkv *.webm *.flv"), ("All Files", "*.*")]
        )
        if filename:
            self.input_file.set(filename)
            self.update_default_output_name()

    def update_default_output_name(self):
        inp = self.input_file.get().strip()
        if not inp:
            return

        trim_opt = self.trim_option.get()
        preset_key = self.selected_preset.get()

        dir_name, file_name = os.path.split(inp)
        base, _ = os.path.splitext(file_name)
        suffix = f"_BG_Loop_{trim_opt}s" if trim_opt not in ["auto", "full"] else f"_BG_{preset_key}"
        default_out = os.path.join(dir_name, f"{base}{suffix}.mp4")

        self.output_file.set(default_out)
        self.status_label.config(text=f"Ready: {os.path.basename(inp)}", fg="#a6e3a1")

    def browse_output_file(self):
        current_out = self.output_file.get().strip()
        initial_dir = os.path.dirname(current_out) if current_out else ""
        initial_file = os.path.basename(current_out) if current_out else "Background_Video.mp4"

        filename = filedialog.asksaveasfilename(
            title="Select Save Location & File Name",
            initialdir=initial_dir,
            initialfile=initial_file,
            defaultextension=".mp4",
            filetypes=[("MP4 Video (*.mp4)", "*.mp4"), ("All Files", "*.*")]
        )
        if filename:
            self.output_file.set(filename)
            self.status_label.config(text=f"Save path set: {os.path.basename(filename)}", fg="#f9e2af")

    def animate_spinner(self):
        if not self.is_converting:
            return
        self.spin_idx = (self.spin_idx + 1) % len(self.spin_symbols)
        symbol = self.spin_symbols[self.spin_idx]
        current_txt = self.status_label.cget("text")
        if "Converting" in current_txt or "Cutting" in current_txt:
            base_txt = current_txt.split("]", 1)[-1] if "]" in current_txt else current_txt
            self.status_label.config(text=f"⏳ [{symbol}] {base_txt.strip()}")
        self.root.after(150, self.animate_spinner)

    def start_conversion(self):
        inp = self.input_file.get().strip()
        outp = self.output_file.get().strip()

        if not inp:
            messagebox.showwarning("No File", "Please select a source video file first!")
            return

        if not os.path.exists(inp):
            messagebox.showerror("Error", f"Source file not found:\n{inp}")
            return

        if not outp:
            messagebox.showwarning("No Save Path", "Please choose a save location & file name!")
            return

        if self.is_converting:
            return

        self.is_converting = True
        self.convert_btn.config(state="disabled", bg="#585b70", text="⏳ Cutting & Converting Video... Please Wait")
        self.progress_bar["value"] = 0
        self.status_label.config(text="⏳ [ ◐ ] Starting conversion...", fg="#f9e2af")

        preset_key = self.selected_preset.get()
        trim_opt = self.trim_option.get()

        custom_trim = None
        if trim_opt == "30":
            custom_trim = 30
        elif trim_opt == "60":
            custom_trim = 60
        elif trim_opt == "120":
            custom_trim = 120
        elif trim_opt == "full":
            custom_trim = 0

        # Start visual spinning animation
        self.animate_spinner()

        def run_thread():
            try:
                def progress_cb(pct, line_str, speed_str):
                    if pct is not None:
                        def update_ui():
                            self.progress_bar["value"] = pct
                            spd = f" (Speed: {speed_str})" if speed_str else ""
                            self.status_label.config(text=f"Converting video... {pct:.1f}%{spd}", fg="#f9e2af")
                        self.root.after(0, update_ui)

                convert_video(inp, outp, preset_key, custom_trim=custom_trim, progress_callback=progress_cb)

                self.root.after(0, self.on_success, outp)
            except Exception as e:
                self.root.after(0, self.on_error, str(e))

        threading.Thread(target=run_thread, daemon=True).start()

    def on_success(self, outp):
        self.is_converting = False
        self.progress_bar["value"] = 100
        self.convert_btn.config(state="normal", bg="#a6e3a1", text="🚀 AUTO-CUT & COMPRESS VIDEO (ভিডিও কেটে ছোট করুন)")
        size_mb = os.path.getsize(outp) / (1024 * 1024)
        
        # Update inline status message - NO EXTRA POPUP WINDOW!
        file_name = os.path.basename(outp)
        self.status_label.config(
            text=f"✅ Done! Saved: {file_name} ({size_mb:.2f} MB)",
            fg="#a6e3a1"
        )

    def on_error(self, err_msg):
        self.is_converting = False
        self.progress_bar["value"] = 0
        self.convert_btn.config(state="normal", bg="#a6e3a1", text="🚀 AUTO-CUT & COMPRESS VIDEO (ভিডিও কেটে ছোট করুন)")
        self.status_label.config(text=f"❌ Error: {err_msg}", fg="#f38ba8")
        messagebox.showerror("Conversion Failed", f"An error occurred:\n{err_msg}")

if __name__ == "__main__":
    root = tk.Tk()
    app = VideoConverterGUI(root)
    root.mainloop()
