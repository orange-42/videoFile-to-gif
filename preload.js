const { contextBridge, ipcRenderer } = require('electron');

// 使用 contextBridge 暴露多个 API
contextBridge.exposeInMainWorld('electron', {
  // 保存文件
  saveFile: (fileData) => {
    console.log(fileData, 'exposeInMainWorld!exposeInMainWorldexposeInMainWorldexposeInMainWorldexposeInMainWorldexposeInMainWorldexposeInMainWorld')
    return ipcRenderer.invoke('save-file', fileData)
  }, 
  // 生成 GIF
  generateGif: (formData) => {
    console.log(formData, 'generateGif=generateGif=formData')
    return ipcRenderer.invoke('generate-gif', formData)
  }
});
