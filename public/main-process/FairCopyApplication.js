const { BrowserWindow, ipcMain } = require('electron')
const { ProjectStore, createProjectArchive } = require('./ProjectStore')
const { MainMenu } = require('./MainMenu')
const fs = require('fs')

const indexFilePath = 'build/index.html'
const debugBaseDir = `${process.cwd()}/public/main-process`
const distBaseDir = __dirname

class FairCopyApplication {

  constructor() {
    this.mainWindow = null
    this.imageViews = []
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

    // let render window handle on close (without browser restrictions)
    this.mainWindow.on('close', () => {
      if( !this.exiting ) {
        this.sendToMainWindow('requestExitApp')
        return false  
      }
    })

    ipcMain.on('requestResource', (event,resourceID) => { 
      this.projectStore.openResource(resourceID).then(()=>{
        console.log(`opened resourceID: ${resourceID}`)
      }) 
    })
    ipcMain.on('requestSave', (event,resourceID, resourceData) => { this.projectStore.saveResource(resourceID,resourceData) })
    ipcMain.on('addResource', (event, resourceEntry, resourceData) => { this.projectStore.addResource(resourceEntry,resourceData) })
    ipcMain.on('removeResource', (event, resourceID) => { this.projectStore.removeResource(resourceID) })
    ipcMain.on('updateResource', (event, resourceEntry) => { this.projectStore.updateResource(resourceEntry) })
    ipcMain.on('requestSaveConfig', (event,fairCopyConfig) => { this.projectStore.saveFairCopyConfig(fairCopyConfig) })
    ipcMain.on('requestSaveIDMap', (event,idMap) => { this.projectStore.saveIDMap(idMap) })
    ipcMain.on('exitApp', (event) => { this.exitApp() })

    ipcMain.on('requestImport', (event) => { 
      const paths = this.mainMenu.openImport()
      const path = paths ? paths[0] : null
      if( path ) {
        const data = fs.readFileSync(path).toString('utf-8')
        const importData = { path, data }
        this.sendToMainWindow('importOpened', importData )  
      }
    })

    ipcMain.on('requestExport', (event, exportOptions) => { 
      const paths = this.mainMenu.openExport()
      const path = paths ? paths[0] : null
      if( path ) {
        this.projectStore.exportResources(exportOptions,path).then( () => { 
          console.log(`Resources exported.`)
        })
      }
    })

    ipcMain.on('requestImageView', (event, imageViewInfo) => { 
      this.createImageWindow(imageViewInfo).then( () => { 
        console.log(`Opened image view.`)
      })
    })
  }

  async createProjectWindow() {

    this.projectWindow = await this.createWindow('project-window-preload.js', 740, 500, false, '#E6DEF9' )

    ipcMain.on('requestNewPath', (event) => { 
      const targetPath = this.mainMenu.selectPath()
      this.projectWindow.webContents.send('pathSelected', targetPath)
    })

    ipcMain.on('requestNewProject', (event, projectInfo) => { 
      createProjectArchive({ ...projectInfo, appVersion: this.versionNumber}, this.baseDir)
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

  async createImageWindow(imageViewInfo) {
    const imageView = await this.createWindow('image-window-preload.js', 800, 600, true, '#fff', true )
    this.imageViews.push(imageView)
    await this.projectStore.openImageView(imageView,imageViewInfo)
  }

  exitApp() {
    if( !this.exiting ) {
      this.exiting = true
      this.projectStore.quitSafely(() => {
        for( const imageView of this.imageViews ) {
          imageView.close()
        }
        this.mainWindow.close()
      })  
    }
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
      this.projectStore.openProject(targetFile).then( () => { 
        console.log(`Opened project: ${targetFile}`)
      })
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