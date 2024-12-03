const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const log = require('electron-log');
log.transports.file.file = 'app.log'
console.log('Log file path:', log.transports.file.getFile())

const ffmpeg = require('fluent-ffmpeg');
// const ffmpegPath = require('ffmpeg-static');
const crypto = require('crypto');
log.info(process.env.NODE_ENV)
log.info(process.resourcesPath)

// 在生产环境中，动态设置 ffmpeg 路径
let ffmpegPath;
if (process.env.NODE_ENV === 'development') {
    // 开发环境中，使用 ffmpeg-static 提供的路径
  ffmpegPath = require('ffmpeg-static');
} else {
  // 在打包后的应用中，ffmpeg 位于资源路径下
  ffmpegPath = path.join(process.resourcesPath, 'ffmpeg');
  log.info(ffmpegPath, 'ffmpegPath')
}

// ffmpeg.setFfmpegPath(ffmpegPath)
console.log(ffmpegPath, 'ffmpegPath=ffmpegPathffmpegPath!!!!!!!!')

// 设置 ffmpeg 路径
ffmpeg.setFfmpegPath(ffmpegPath);


// 创建窗口
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      // 添加以下配置
    //   webSecurity: false
    }
  });

//   http://127.0.0.1:5501/vue-vite-app/dist/index.html
console.log('当前目录__dirname:', __dirname);
console.log('尝试加载的HTML文件路径:', path.join(__dirname, 'assets/index.html'));
// loadURL
  win.loadFile(path.join(__dirname, 'assets/index.html'));  // Vue 3 打包后的静态页面路径
  // 打开开发者工具
//   win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

let savedFilePath = ''
// 监听 saveFile 请求并将文件保存到本地
ipcMain.handle('save-file', async (event, file) => {
    try {
      if (!file || !file.name || !file.data) {
        throw new Error('Invalid file object');
      }
      const fileBuffer = Buffer.from(file.data);
      const tempFilePath = path.join(os.tmpdir(), file.name);
      fs.writeFileSync(tempFilePath, fileBuffer);
      savedFilePath = tempFilePath
      return tempFilePath;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  })

  let step = 1
// 生成 GIF 的逻辑
ipcMain.handle('generate-gif', async (event, formData) => {
  try {
    // const { filePath, startTime, endTime, width, fps } = formData;
    // console.log(filePath, startTime, endTime, width, fps, 'formData=formData')
    // const cacheKey = crypto.createHash('md5')
    //   .update(filePath)
    //   .update(`${startTime}-${endTime}`)
    //   .digest('hex');

    // // 临时目录路径
    // const tempDir = os.tmpdir();
    // const inputPath = path.join(tempDir, `${cacheKey}_input.mp4`);
    // const palettePath = path.join(tempDir, `${cacheKey}_palette.png`);
    // const outputPath = path.join(tempDir, `${cacheKey}_output.gif`);


    // // 写入视频文件
    // fs.writeFileSync(inputPath, videoBuffer);

    const { startTime, endTime, width, fps } = formData;
    console.log(startTime, endTime, savedFilePath, 'endTime=endTime')
     // 临时目录路径
     const tempDir = os.tmpdir();
     const palettePath = path.join(tempDir, 'palette.png');
     const outputPath = path.join(tempDir, 'output.gif');
     step = ++step
    // 打印日志以检查传递的数据
    // console.log('Received data:', formData);

    // // 创建缓存 Key
    // const cacheKey = crypto.createHash('md5')
    //   .update(fileData.toString())
    //   .update(`${startTime}-${endTime}`)
    //   .digest('hex');

    // // 临时目录路径
    // const tempDir = os.tmpdir();
    // const inputPath = path.join(tempDir, `${cacheKey}_input.mp4`);
    // const palettePath = path.join(tempDir, `${cacheKey}_palette.png`);
    // const outputPath = path.join(tempDir, `${cacheKey}_output.gif`);

    // 将视频数据写入文件
    // const videoBuffer = Buffer.from(fileData); // 将传递的 fileData 转换为 Buffer
    // fs.writeFileSync(inputPath, videoBuffer);


    const generatePalette = () => {
      return new Promise((resolve, reject) => {
        ffmpeg(savedFilePath)
          .inputOptions([`-ss ${startTime}`, `-to ${endTime}`])
          .outputOptions([
            `-vf fps=${fps},scale=${width}:-1:flags=spline,palettegen=max_colors=256`,
          ])
          .output(palettePath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    };

    const generateGif = () => {
      return new Promise((resolve, reject) => {
        ffmpeg(savedFilePath)
           .inputOptions([`-ss ${startTime}`, `-to ${endTime}`])
          .input(palettePath)
          .complexFilter([
            `[0:v]fps=${fps},scale=${width}:-1:flags=spline[v]`,
            `[v][1:v]paletteuse`,
          ])
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    };

    // 生成调色板和 GIF
    await generatePalette();
    step = ++step
    await generateGif();
    step = ++step

    // 读取生成的 GIF 并返回
    const gifBuffer = fs.readFileSync(outputPath);
    step = ++step
    return gifBuffer;  // 返回 GIF Buffer
  } catch (err) {
    console.error(err);
    throw new Error(`Error generating GIF 走到第 ${step} 步, 报错信息： ${err}`);
  }
});
