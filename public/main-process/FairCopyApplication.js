const { BrowserWindow, ipcMain } = require('electron')
const { ProjectStore } = require('./ProjectStore')
const { MainMenu } = require('./MainMenu')
const fs = require('fs')

const indexFilePath = 'build/index.html'
const debugBaseDir = `${process.cwd()}/public/main-process`
const distBaseDir = __dirname

class FairCopyApplication {

  constructor() {
    this.mainWindow = null
    this.noteWindows = {}
    this.baseDir = this.isDebugMode() ? debugBaseDir : distBaseDir
    this.versionNumber = this.getVersionNumber()
  }

  getVersionNumber() {
    const debugPath = `${process.cwd()}/public/version.txt`
    const distPath = `${__dirname}/../version.txt`
    const versionFilePath = this.isDebugMode() ? debugPath : distPath
    const versionNumber = fs.readFileSync(versionFilePath)
    return versionNumber
  }

  isDebugMode() {
    return ( process.env.FAIRCOPY_DEBUG_MODE !== undefined && process.env.FAIRCOPY_DEBUG_MODE !== false && process.env.FAIRCOPY_DEBUG_MODE !== 'false' )   
  }

  async createMainWindow(onClose) {
    this.mainMenu = new MainMenu(this)
    this.projectStore = new ProjectStore(this)

    this.mainWindow = await this.createWindow('main-window-preload.js', onClose, 1440, 900, true, '#fff' )

    ipcMain.on('openSaveFileDialog', this.mainMenu.saveFileMenu)
    ipcMain.on('requestResource', (event,resourceID) => { this.projectStore.openResource(resourceID) })
    // ipcMain.on('createNoteEditorWindow', this.createNoteEditorWindow)
    // ipcMain.on('closeNoteWindow', this.closeNoteWindow)
  }

  async createProjectWindow(onAppClose) {
    this.projectWindow = await this.createWindow('project-window-preload.js', onAppClose, 720, 450, false, '#E6DEF9')

    ipcMain.on('requestProject', (event,targetFile) => {
      this.createMainWindow(onAppClose).then(() => {
        this.projectWindow.close()
        this.projectWindow = null
        this.openProject(targetFile)
      })
    })
  }

  openProject(targetFile) {
    this.projectStore.openProject(targetFile)
  }

  sendToMainWindow(message, params) {
    this.mainWindow.webContents.send(message, params)
  }

  async createWindow(preload,onClose, width, height, resizable, backgroundColor) {

    // Create the browser window.
    const browserWindow = new BrowserWindow({
      width,
      height,
      webPreferences: {
          enableRemoteModule: false,
          preload: `${this.baseDir}/${preload}`,
      },
      resizable,
      backgroundColor
    })

    // Emitted when the window is closed.
    browserWindow.on('closed', onClose )

    // and load the index.html of the app.
    if( this.isDebugMode() ) {
      await browserWindow.loadURL('http://localhost:3000')
      browserWindow.webContents.openDevTools({ mode: 'bottom'} )
    } else {
      await browserWindow.loadFile(indexFilePath)
    }

    // For now, there is only one document window
    return browserWindow
  }
}

exports.FairCopyApplication = FairCopyApplication


// TODO note window code to refactor

// async createNoteEditorWindow = (event, noteID) => {

//   if( this.noteWindows[noteID] ) {
//     this.noteWindows[noteID].focus()
//     console.log("Window already open for note.")
//     // TODO set focus on this windo
//     return
//   }

//   this.mainWindow = await this.createWindow('main-window-preload.js')

//   // Create the browser window
//   const browserWindow = new BrowserWindow({
//       parent: this.mainWindow,
//       width: 1000,
//       height: 700,
//       frame: false,
//       webPreferences: {
//           enableRemoteModule: false,
//           preload: `${this.baseDir}/note-window-preload.js`
//       }
//   })

//   // Emitted when the note window is closed.
//   browserWindow.on('closed', () => {
//     this.noteWindows[noteID] = null
//   } )

//   const loadNote = () => {
//     // send message indicating the target note
//     browserWindow.webContents.send('noteOpened', noteID)
//   }

//   // and load the index.html of the app.
//   if( isDebugMode() ) {
//       browserWindow.loadURL('http://localhost:3000/index.html').then(loadNote)
//   } else {
//       browserWindow.loadFile(indexFilePath).then(loadNote)
//   }

//   // For now, there is only one document window
//   this.noteWindows[noteID] = browserWindow
// }
// closeNoteWindow = (event, noteID) => {
//   const noteWindow = this.noteWindows[noteID]

//   if( noteWindow ) {
//     noteWindow.close();
//   }
// }