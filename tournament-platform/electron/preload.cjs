const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("kingLeagueApp", {
  shell: "electron",
  platform: process.platform,
});