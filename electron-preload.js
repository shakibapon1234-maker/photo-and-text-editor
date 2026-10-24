const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studioPdf', {
  export: (html, filename) => ipcRenderer.invoke('presentation:export-pdf', { html, filename })
});
