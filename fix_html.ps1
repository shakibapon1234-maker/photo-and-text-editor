$filePath = 'd:\Wings fly Helper\photo and text editor\photo-and-text-editor\presentation-player.html'
$enc = [System.Text.UTF8Encoding]::new($false)
$lines = [System.IO.File]::ReadAllLines($filePath, $enc)

# Keep lines 1-1541 (index 0..1540): up to and including the setInterval closing "}, 150);"
# Then inject clean remote modal code
# Then close with </script> </body> </html>

$keepBefore = $lines[0..1540]

$newCode = @(
'',
'    // Mobile Remote Modal',
'    document.getElementById(''remoteBtn'').addEventListener(''click'', async () => {',
'      const oldModal = document.getElementById(''remoteModal'');',
'      if (oldModal) oldModal.remove();',
'',
'      const modal = document.createElement(''div'');',
'      modal.id = ''remoteModal'';',
'      modal.className = ''remote-modal-backdrop'';',
'      modal.innerHTML = [',
'        ''<div class="remote-modal-card">'',',
'          ''<div class="remote-modal-head">'',',
'            ''<span>Mobile Remote Control</span>'',',
'            ''<button class="remote-modal-close" id="rmClose">&#x2715;</button>'',',
'          ''</div>'',',
'          ''<p style="font-size:13px;color:#94a3b8;margin:8px 0;line-height:1.6;">'',',
'            ''Laptop and mobile must be on the <strong style="color:#fff;">same Wi-Fi or hotspot</strong>. Scan QR:'',',
'          ''</p>'',',
'          ''<div style="background:#fff;padding:10px;border-radius:14px;display:inline-block;margin:4px 0 10px;">'',',
'            ''<img id="qrImg" src="" alt="QR" width="180" height="180" style="display:block;">'',',
'          ''</div>'',',
'          ''<div style="background:#0f172a;border:1.5px solid #38bdf8;border-radius:10px;padding:10px 12px;margin-bottom:10px;">'',',
'            ''<div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:5px;">Type in mobile browser:</div>'',',
'            ''<div id="remoteUrlText" style="color:#38bdf8;font-weight:900;font-size:15px;word-break:break-all;user-select:all;-webkit-user-select:all;">Loading...</div>'',',
'          ''</div>'',',
'          ''<button id="copyBtn" style="width:100%;padding:11px;border-radius:10px;background:#1d4ed8;border:none;color:#fff;font-size:14px;font-weight:800;cursor:pointer;">Copy Link</button>'',',
'        ''</div>''',
'      ].join('''');',
'      document.body.appendChild(modal);',
'',
'      // Wire up close button',
'      document.getElementById(''rmClose'').onclick = () => modal.remove();',
'',
'      // Wire up copy button',
'      document.getElementById(''copyBtn'').onclick = () => {',
'        const txt = document.getElementById(''remoteUrlText'').textContent;',
'        if (!navigator.clipboard) return;',
'        navigator.clipboard.writeText(txt).then(() => {',
'          const b = document.getElementById(''copyBtn'');',
'          if (!b) return;',
'          b.textContent = ''Copied!'';',
'          b.style.background = ''#059669'';',
'          setTimeout(() => { b.textContent = ''Copy Link''; b.style.background = ''#1d4ed8''; }, 2000);',
'        });',
'      };',
'',
'      // Fetch real LAN IP from server',
'      let remoteUrl = ''http://192.168.68.101:8000/remote.html'';',
'      try {',
'        const r = await fetch(''/api/ip?t='' + Date.now());',
'        const d = await r.json();',
'        if (d.remoteUrl && !d.remoteUrl.includes(''127.0.0.1'') && !d.remoteUrl.includes(''localhost'')) {',
'          remoteUrl = d.remoteUrl;',
'        }',
'      } catch (_) {}',
'',
'      // Set URL text',
'      const urlEl = document.getElementById(''remoteUrlText'');',
'      if (urlEl) urlEl.textContent = remoteUrl;',
'',
'      // Load QR image',
'      const qrEl = document.getElementById(''qrImg'');',
'      if (qrEl) {',
'        qrEl.onerror = function() {',
'          this.parentElement.innerHTML = ''<div style="padding:15px;color:#dc2626;font-size:12px;text-align:center">QR load failed.<br>Use the link below.</div>'';',
'        };',
'        qrEl.src = ''https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&data=''',
'          + encodeURIComponent(remoteUrl);',
'      }',
'    });',
'  </script>',
'</body>',
'</html>'
)

$newLines = $keepBefore + $newCode
[System.IO.File]::WriteAllLines($filePath, $newLines, $enc)
Write-Host "Done. File now has $($newLines.Length) lines."
Write-Host "Last 5 lines:"
$newLines[($newLines.Length - 5)..($newLines.Length - 1)] | ForEach-Object { Write-Host "  $_" }
