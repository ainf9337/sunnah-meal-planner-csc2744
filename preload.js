// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// limited Node.js functionality
contextBridge.exposeInMainWorld('electronAPI', {
  
});