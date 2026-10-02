// Puente seguro entre la interfaz y el proceso principal (sin acceso directo a Node).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desk", {
  get: p => ipcRenderer.invoke("store:get", p),
  set: (p, data) => ipcRenderer.invoke("store:set", p, data),
  del: p => ipcRenderer.invoke("store:del", p),
  list: coll => ipcRenderer.invoke("store:list", coll),
  dataPath: () => ipcRenderer.invoke("store:path"),
  exportData: () => ipcRenderer.invoke("store:export"),
  importData: () => ipcRenderer.invoke("store:import"),
  openExternal: url => ipcRenderer.invoke("open-external", url),
  appInfo: () => ipcRenderer.invoke("app:info"),
  checkUpdate: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onMenu: cb => ipcRenderer.on("menu", (_e, a) => cb(a))
});
