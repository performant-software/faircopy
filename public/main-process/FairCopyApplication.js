const { app, BrowserWindow, ipcMain, protocol } = require('electron')
const { ProjectStore, createProjectArchive } = require('./ProjectStore')
const { exportResources } = require('./export-xml')
const { MainMenu } = require('./MainMenu')
const { checkForUpdates, downloadUpdate } = require('./app-updater')
const fs = require('fs')
const Jimp = require("jimp")
const log = require('electron-log')

const indexFilePath = 'build/index.html'
const debugBaseDir = `${process.cwd()}/public/main-process`
const distBaseDir = __dirname

class FairCopyApplication {

  constructor() {
    this.mainWindow = null
    this.imageViews = []
    this.baseDir = this.isDebugMode() ? debugBaseDir : distBaseDir
    this.config = this.getConfig()
    this.mainMenu = new MainMenu(this)
    this.exiting = false
    this.returnToProjectWindow = false
    this.autoUpdaterStarted = false

    this.initLocalFileProtocol()
    this.initIPC()
  }

  getConfig() {
    const distConfigJSON = fs.readFileSync(`${this.baseDir}/config/dist-config.json`).toString('utf-8')
    const distConfig = JSON.parse(distConfigJSON)
    distConfig.releaseNotes = fs.readFileSync(`${this.baseDir}/release-notes/latest.md`).toString('utf-8')
    distConfig.version = this.isDebugMode() ? "0.0.0" : app.getVersion()
    return distConfig
  }

  isDebugMode() {
    return ( process.env.FAIRCOPY_DEBUG_MODE !== undefined && process.env.FAIRCOPY_DEBUG_MODE !== false && process.env.FAIRCOPY_DEBUG_MODE !== 'false' )   
  }

  // local file protocol for accessing image resources
  initLocalFileProtocol() {
    protocol.registerFileProtocol('local', (request, callback) => {
      this.projectStore.openImageResource(request.url).then( (safePath) => {
        if( safePath ) callback(decodeURIComponent(safePath))
      })
    })
  }

  initIPC() {
    
    ipcMain.on('checkForUpdates', (event,licenseData) => { checkForUpdates(licenseData, this.config, this.sendToMainWindow) })
    ipcMain.on('downloadUpdate', (event) => { downloadUpdate(this.sendToMainWindow) })
    ipcMain.on('closeProject', (event) => { 
      this.closeProject()
      this.exitApp()
    })
    
    ipcMain.on('exitApp', (event) => { 
      if( this.projectWindow ) {
        this.projectWindow.close() 
      } else {
        this.exitApp() 
      }
    })
    ipcMain.on('addResource', (event, resourceEntry, resourceData, resourceMap) => { this.projectStore.addResource(resourceEntry,resourceData,resourceMap) })

    ipcMain.on('removeResource', (event, resourceID) => { 
      this.projectStore.removeResource(resourceID) 
      this.sendToMainWindow('resourceEntryUpdated', { deleted: true, resourceID } )
      
      // close any open image windows
      this.imageViews = this.imageViews.filter((imageView) => {
        if( imageView.resourceID === resourceID ) {
          imageView.imageWindow.close()
          return false
        }
        return true
      })
    })

    ipcMain.on('requestSave', (event, msgID, resourceID, resourceData) => { 
      const ok = this.projectStore.saveResource(resourceID, resourceData) 
      if( ok ) {
        const update = { messageID: msgID, resourceID, resourceData }
        this.sendToAllWindows('resourceUpdated', update )
      }
    })
    ipcMain.on('updateIDMap', (event, msgID, idMap) => { 
      this.projectStore.onIDMapUpdated(msgID, idMap)
    })
    ipcMain.on('abandonResourceMap', (event, resourceID) => { 
      this.projectStore.abandonResourceMap(resourceID)
    })
    ipcMain.on('updateResource', (event, msgID, resourceEntry) => { 
      const ok = this.projectStore.updateResource(resourceEntry) 
      if( ok ) {
        this.sendToAllWindows('resourceEntryUpdated', { messageID: msgID, resourceEntry } )
      }
    })
    ipcMain.on('requestImageData', (event) => {
      const paths = this.mainMenu.openAddImage()
      this.processImageData(paths).then((imageData) => {
        this.sendToAllWindows('imagesOpened', imageData )  
      })     
    })
    
    // Main window events //////

    ipcMain.on('requestResource', (event,resourceID) => { 
      this.projectStore.openResource(resourceID).then(()=>{
        log.info(`opened resourceID: ${resourceID}`)
      }) 
    })

    ipcMain.on('requestSaveConfig', (event,fairCopyConfig) => { this.projectStore.saveFairCopyConfig(fairCopyConfig) })
    ipcMain.on('updateProjectInfo', (event,projectInfo) => { this.projectStore.updateProjectInfo(projectInfo) })
    
    ipcMain.on('requestPaste', (event) => { 
      if( this.mainWindow ) {
          this.mainWindow.webContents.paste()
      }
    })

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
        exportResources(exportOptions,path,this.projectStore).then( () => { 
          log.info(`Resources exported.`)
        })
      }
    })

    ipcMain.on('requestImageView', (event, imageViewInfo) => { 
      this.createImageWindow(imageViewInfo).then( () => { 
        log.info(`Opened image view.`)
      })
    })

    ipcMain.on('selectedZones', (event, selectedZones) => { 
      this.sendToAllWindows('selectedZones', selectedZones )  
    })

    // Project Window events ///////

    ipcMain.on('requestNewPath', (event) => { 
      const targetPath = this.mainMenu.selectPath()
      this.projectWindow.webContents.send('pathSelected', targetPath)
    })

    ipcMain.on('requestNewProject', (event, projectInfo) => { 
      createProjectArchive({ ...projectInfo, appVersion: this.config.version}, this.baseDir)
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

  async createMainWindow() {
    this.projectStore = new ProjectStore(this)

    if( this.mainWindow ) {
      if( !this.mainWindow.isDestroyed() ) {
        this.mainWindow.destroy()
      }
      this.mainWindow = null
    }

    const windowSize = this.isDebugMode() ? [1440,1200] : [1440,900]
    this.mainWindow = await this.createWindow('main-window-preload.js', ...windowSize, true, '#fff', true )
    this.mainWindow.webContents.send('appConfig', this.config)

    // let render window handle on close (without browser restrictions)
    this.mainWindow.on('close', (event) => {
      if( !this.exiting ) {
        this.sendToMainWindow('requestExitApp')
        event.preventDefault()
      }     
    })
  }

  async createProjectWindow() {
    this.projectWindow = await this.createWindow('project-window-preload.js', 740, 550, false, '#E6DEF9' )
    this.projectWindow.webContents.send('appConfig', this.config)
  }  

  async createImageWindow(imageViewInfo) {
    const imageWindow = await this.createWindow('image-window-preload.js', 800, 600, true, '#fff', true )
    const imageView = {
      imageWindow,
      resourceID: imageViewInfo.resourceID
    }
    this.imageViews.push(imageView)

    imageWindow.on('close', (event) => {
      // remove image from list
      this.imageViews = this.imageViews.filter( v => v.imageWindow !== imageWindow )
    })

    await this.projectStore.openImageView(imageWindow,imageViewInfo)
  }

  exitApp() {
    if( !this.exiting ) {
      this.exiting = true
      this.projectStore.quitSafely(() => {
        for( const imageView of this.imageViews ) {
          const { imageWindow } = imageView
          if( !imageWindow.isDestroyed() ) {
            imageWindow.close()
          }
        }
        this.imageViews = []

        if( this.returnToProjectWindow ) {
          this.createProjectWindow().then(() => {
            this.returnToProjectWindow = false
            this.exiting = false
          })
        } 

        if( this.mainWindow ) {
          this.mainWindow.close()
        }
      })  
    }
  }

  openProject(targetFile) {
    this.createMainWindow().then(() => {
      if( this.projectWindow ) {
        this.projectWindow.close()
        this.projectWindow = null  
      }
      this.projectStore.openProject(targetFile).then( () => { 
        log.info(`Opened project: ${targetFile}`)
      })
    })
  }

  closeProject() {
    if( this.mainWindow && !this.mainWindow.isDestroyed() ) {
      this.returnToProjectWindow = true
      this.mainWindow.close()
    }
    if( this.projectWindow && !this.projectWindow.isDestroyed()) {
      this.projectWindow.close()
    }
  }

  sendToMainWindow = (message, params) => {
    this.mainWindow.webContents.send(message, params)
  }

  sendToAllWindows(message, params) {
    this.sendToMainWindow(message, params)
    for( const imageView of this.imageViews ) {
      const { imageWindow } = imageView 
      imageWindow.webContents.send(message, params)
    }
  }

  async processImageData(paths) {
    const imageData = []
    for( const path of paths ) {
      const image = await Jimp.read(path)
      const mimeType = image.getMIME()
      const width = image.bitmap.width
      const height = image.bitmap.height
      imageData.push({
        path,
        width,
        height,
        mimeType
      })
    }
    return imageData
  }

  async createWindow(preload, width, height, resizable, backgroundColor, devTools ) {

    // Since dev mode is loaded via localhost, disable web security so we can use file:// urls.
    const webSecurity = !this.isDebugMode() 
    
    // Create the browser window.
    const browserWindow = new BrowserWindow({
      width,
      height,
      webPreferences: {
          webSecurity,
          enableRemoteModule: false,
          contextIsolation: false,
          preload: `${this.baseDir}/${preload}`,
          spellcheck: false
      },
      resizable,
      backgroundColor
    })

    // and load the index.html of the app.
    if( this.isDebugMode() ) {
      await browserWindow.loadURL('http://localhost:4000')
      if(devTools) browserWindow.webContents.openDevTools({ mode: 'bottom'} )
    } else {
      await browserWindow.loadFile(indexFilePath)
    }

    // For now, there is only one document window
    return browserWindow
  }
}

exports.FairCopyApplication = FairCopyApplication