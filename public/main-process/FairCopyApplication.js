const { BrowserWindow, ipcMain } = require('electron')
const { ProjectStore, createProjectArchive } = require('./ProjectStore')
const { MainMenu } = require('./MainMenu')
const fs = require('fs')

const indexFilePath = 'build/index.html'
const debugBaseDir = `${process.cwd()}/public/main-process`
const distBaseDir = __dirname

class FairCopyApplication {

  constructor(onAppClose) {
    this.onAppClose = onAppClose
    this.mainWindow = null
    // this.noteWindows = {}
    this.baseDir = this.isDebugMode() ? debugBaseDir : distBaseDir
    this.versionNumber = this.getVersionNumber()
    this.mainMenu = new MainMenu(this)
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

  async createMainWindow() {
    this.projectStore = new ProjectStore(this)

    this.mainWindow = await this.createWindow('main-window-preload.js', 1440, 900, true, '#fff', true )

    ipcMain.on('requestResource', (event,resourceID) => { this.projectStore.openResource(resourceID) })
    ipcMain.on('requestSave', (event,resourceID,resourceData) => { this.projectStore.saveResource(resourceID,resourceData) })
    ipcMain.on('requestNewProject', (event, projectInfo) => { 
      // TODO
    })

    // TODO refactor
    // ipcMain.on('createNoteEditorWindow', this.createNoteEditorWindow)
    // ipcMain.on('closeNoteWindow', this.closeNoteWindow)
  }

  async createProjectWindow() {

    this.projectWindow = await this.createWindow('project-window-preload.js', 720, 480, false, '#E6DEF9' )

    ipcMain.on('requestNewPath', (event) => { 
      const targetPath = this.mainMenu.selectPath()
      this.projectWindow.webContents.send('pathSelected', targetPath)
    })

    ipcMain.on('requestNewProject', (event, projectInfo) => { 
      createProjectArchive(projectInfo)
      this.openProject(projectInfo.filePath)
    })

    ipcMain.on('requestFileOpen', (event) => { 
      this.mainMenu.openFileMenu() 
    })

    ipcMain.on('requestProject', (event,targetFile) => {
      if( fs.existsSync(targetFile) ) {
        this.openProject(targetFile)
      }
    })
  }

  openProject(targetFile) {
    if( this.mainWindow ) {
      this.mainWindow.close()
      this.mainWindow = null
      ipcMain.removeAllListeners()
    }
    this.createMainWindow().then(() => {
      if( this.projectWindow ) {
        this.projectWindow.close()
        this.projectWindow = null  
      }
      this.projectStore.openProject(targetFile)
    })
  }

  closeProject() {
    if( this.mainWindow ) {
      this.mainWindow.close()
      this.mainWindow = null
      ipcMain.removeAllListeners()
    }
    if( !this.projectWindow ) {
      this.createProjectWindow().then(() => {})
    }
  }

  sendToMainWindow(message, params) {
    this.mainWindow.webContents.send(message, params)
  }

  async createWindow(preload, width, height, resizable, backgroundColor, devTools ) {

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
    browserWindow.on('closed', () => {
      this.onAppClose()
    } )

    // and load the index.html of the app.
    if( this.isDebugMode() ) {
      await browserWindow.loadURL('http://localhost:3000')
      if(devTools) browserWindow.webContents.openDevTools({ mode: 'bottom'} )
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