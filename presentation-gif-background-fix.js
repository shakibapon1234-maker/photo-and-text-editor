(() => {
  const $ = id => document.getElementById(id);
  const input = $('backgroundImageInput');
  if (!input) return;

  function makeVideoPoster(file, slide) {
    // A small still image keeps sidebar thumbnails meaningful without running
    // a video decoder for every slide. The source video itself is saved below.
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'metadata';
    video.onloadeddata = () => {
      const capture = () => {
        try {
          const maxWidth = 360;
          const ratio = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((video.videoWidth || 640) * ratio));
          canvas.height = Math.max(1, Math.round((video.videoHeight || 360) * ratio));
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          slide.bgMediaPoster = canvas.toDataURL('image/jpeg', .78);
          if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow();
          render();
        } catch (_) { /* A poster is optional; the video remains usable. */ }
        URL.revokeObjectURL(url);
      };
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = Math.min(.1, Math.max(0, video.duration / 2));
        video.onseeked = capture;
      } else capture();
    };
    video.onerror = () => URL.revokeObjectURL(url);
    video.src = url;
  }

  // Windows/Electron sometimes leave File.type empty for GIFs. Explicitly
  // allow the extension as well as standard image/video MIME types.
  input.accept = 'image/png,image/jpeg,image/webp,image/gif,.gif,video/mp4,video/webm,video/ogg';
  const upload = $('backgroundUpload');
  upload.insertAdjacentHTML('beforeend', '<p id="gifBackgroundHint" class="hint hidden">GIF selected. Native GIF speed cannot be changed by the browser; use a WebM/MP4 background when you need speed control.</p>');
  const hint = $('gifBackgroundHint');

  input.onchange = event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const name = String(file.name || '');
    const isGif = file.type === 'image/gif' || /\.gif$/i.test(name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(name);
    if (!isImage && !isVideo) {
      hint.textContent = 'Please choose a GIF, image, or MP4/WebM/OGG video file.';
      hint.classList.remove('hidden');
      return;
    }

    const slide = active();
    const idx = slides.indexOf(slide);

    if (isVideo) {
      // The Blob is stored by the background-media store; its temporary URL is
      // fast for playback, while the IndexedDB copy survives browser reloads.
      window.PresentationBackgroundMediaStore.saveVideo(file, slide).then(() => {
        slide.background = 'media';
        slide.bgMediaType = 'video';
        slide.brollPreset = 'none';
        delete slide.bgImage;
        hint.classList.add('hidden');
        makeVideoPoster(file, slide);
        render();
        if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow();
      }).catch(() => {
        hint.textContent = 'ভিডিওটি সেভ করা যায়নি। আবার চেষ্টা করুন।';
        hint.classList.remove('hidden');
      });
    } else {
      // Images & GIFs: use FileReader (small enough for base64)
      const reader = new FileReader();
      reader.onload = () => {
        slide.background = 'media';
        slide.bgMedia = reader.result;
        slide.bgMediaType = isGif ? 'gif' : 'image';
        delete slide.bgMediaAssetId;
        if (slide.bgMediaObjURL) URL.revokeObjectURL(slide.bgMediaObjURL);
        delete slide.bgMediaObjURL;
        slide.brollPreset = 'none';
        delete slide.bgImage;
        delete slide.bgMediaPoster;
        hint.textContent = isGif
          ? 'GIF selected. Native GIF speed cannot be changed by the browser; use a WebM/MP4 background when you need speed control.'
          : '';
        hint.classList.toggle('hidden', !isGif);
        render();
        if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow();
      };
      reader.readAsDataURL(file);
    }
  };

  const previousRender = render;
  render = function () {
    previousRender();
    const slide = active();
    const isGif = slide && slide.bgMediaType === 'gif';
    hint.classList.toggle('hidden', !isGif);
    const speed = $('bgPlaybackRate');
    if (speed) {
      speed.disabled = isGif;
      speed.title = isGif ? 'GIF speed is controlled by the GIF file itself. Use WebM/MP4 for speed control.' : '';
    }
  };
})();
