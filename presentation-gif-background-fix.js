(() => {
  const $ = id => document.getElementById(id);
  const input = $('backgroundImageInput');
  if (!input) return;

  // Track Object URLs per slide index so we can revoke them when replaced
  const _videoObjURLs = {};

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
      // Use Object URL for videos — instant, no base64 memory bloat
      // Revoke any previous object URL for this slide
      if (_videoObjURLs[idx]) {
        URL.revokeObjectURL(_videoObjURLs[idx]);
        delete _videoObjURLs[idx];
      }
      const objURL = URL.createObjectURL(file);
      _videoObjURLs[idx] = objURL;

      slide.background = 'media';
      slide.bgMedia = objURL;          // use object URL directly as src
      slide.bgMediaType = 'video';
      slide.brollPreset = 'none';
      delete slide.bgImage;
      hint.classList.add('hidden');
      render();
    } else {
      // Images & GIFs: use FileReader (small enough for base64)
      const reader = new FileReader();
      reader.onload = () => {
        slide.background = 'media';
        slide.bgMedia = reader.result;
        slide.bgMediaType = isGif ? 'gif' : 'image';
        slide.brollPreset = 'none';
        delete slide.bgImage;
        hint.textContent = isGif
          ? 'GIF selected. Native GIF speed cannot be changed by the browser; use a WebM/MP4 background when you need speed control.'
          : '';
        hint.classList.toggle('hidden', !isGif);
        render();
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