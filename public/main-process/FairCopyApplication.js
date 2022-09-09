const { app, BrowserWindow, ipcMain, protocol, shell } = require('electron')
const { createProjectArchive } = require('./create-project-archive')
const { MainMenu } = require('./MainMenu')
const { checkForUpdates, downloadUpdate } = require('./app-updater')
const fs = require('fs')
const Jimp = require("jimp")
const log = require('electron-log')
const { FairCopySession } = require('./FairCopySession')

const indexFilePath = 'build/index.html'
const debugBaseDir = `${process.cwd()}/public/main-process`
const distBaseDir = __dirname

class FairCopyApplication {

  constructor() {
    this.mainWindow = null
    this.fairCopySession = null
    this.imageViews = {}
    this.exiting = false
    this.returnToProjectWindow = false
    this.autoUpdaterStarted = false

    this.baseDir = this.isDebugMode() ? debugBaseDir : distBaseDir
    this.config = this.getConfig()
    this.mainMenu = new MainMenu(this)
    this.initLocalFileProtocol()
    this.initIPC()
  }

  getConfig() {
    const distConfigJSON = fs.readFileSync(`${this.baseDir}/config/dist-config.json`).toString('utf-8')
    const distConfig = JSON.parse(distConfigJSON)
    distConfig.releaseNotes = fs.readFileSync(`${this.baseDir}/release-notes/latest.md`).toString('utf-8')
    distConfig.version = this.isDebugMode() ? process.env.FAIRCOPY_DEV_VERSION : app.getVersion()
    distConfig.websiteURL = distConfig.devMode ? distConfig.devURL : distConfig.prodURL
    return distConfig
  }

  isDebugMode() {
    return ( process.env.FAIRCOPY_DEBUG_MODE !== undefined && process.env.FAIRCOPY_DEBUG_MODE !== false && process.env.FAIRCOPY_DEBUG_MODE !== 'false' )   
  }

  // local file protocol for accessing image resources
  initLocalFileProtocol() {
    protocol.registerFileProtocol('local', (request, callback) => {
      this.fairCopySession.openImageResource(request.url)
      this.localFileProtocolCallback = callback
    })
  }

  initIPC() {
    
    ipcMain.on('checkForUpdates', (event,licenseData) => { checkForUpdates(licenseData, this.sendToMainWindow) })
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
    ipcMain.on('addResource', (event, resourceEntry, resourceData, resourceMap) => { this.fairCopySession.addResource(resourceEntry,resourceData,resourceMap) })

    ipcMain.on('removeResources', (event, resourceIDs) => { 
      this.fairCopySession.removeResources(resourceIDs) 
      
      // close any open image windows
      for( const resourceID of resourceIDs ) {
        const imageView = this.imageViews[resourceID]
        if( imageView ) {
          imageView.close()
        }
        delete this.imageViews[resourceID]  
      }
    })

    ipcMain.on('recoverResources', (event, resourceID) => { 
      this.fairCopySession.recoverResources(resourceID) 
    })

    ipcMain.on('requestResourceView', (event, resourceViewRequest) => { 
      this.fairCopySession.updateResourceView(resourceViewRequest) 
    })

    ipcMain.on('requestCheckedOutResources', (event) => { 
      this.fairCopySession.requestCheckedOutResources() 
    })
    
    ipcMain.on('searchProject', (event, searchQuery) => { 
      this.fairCopySession.searchProject(searchQuery)  
    })
    ipcMain.on('requestSave', (event, msgID, resourceID, resourceData) => { 
      const ok = this.fairCopySession.saveResource(resourceID, resourceData) 
      if( ok ) {
        const update = { messageID: msgID, resourceID, resourceData }
        this.sendToAllWindows('resourceContentUpdated', resourceID, msgID, update )
      }
    })
    ipcMain.on('abandonResourceMap', (event, resourceID) => { 
      this.fairCopySession.abandonResourceMap(resourceID)
    })
    ipcMain.on('updateResource', (event, resourceEntry) => { 
      this.fairCopySession.updateResource(resourceEntry) 
    })
    ipcMain.on('requestImageData', (event) => {
      const paths = this.mainMenu.openAddImage()
      if( paths ) {
        this.processImageData(paths).then((imageData) => {
          this.sendToAllWindows('imagesOpened', imageData )  
        })       
      } else {
        this.sendToAllWindows('imagesOpened', [])
      }
    })

    ipcMain.on('openBuyNowWebpage', (event) => {
      shell.openExternal(`${this.config.websiteURL}/prices`);
    })

    ipcMain.on('openRenewalWebpage', (event, secureID ) => {
      shell.openExternal(`${this.config.websiteURL}/renew/${secureID}`);
    })  

    ipcMain.on('openLandingPage', (event) => {
      shell.openExternal(`${this.config.websiteURL}`);
    })
    
    // Main window events //////

    ipcMain.on('openResource', (event,resourceID) => { 
      this.fairCopySession.openResource(resourceID)
    })

    ipcMain.on('setResourceMap', (event, resourceMap, localID, parentID) => { 
      this.fairCopySession.setResourceMap(resourceMap, localID, parentID)
    })

    ipcMain.on('importContinue', (event) => { 
      this.fairCopySession.importContinue()
    })
    ipcMain.on('importEnd', (event) => { 
      this.fairCopySession.importEnd()
    })

    ipcMain.on('checkIn', (event, email, serverURL, projectID, checkInResources, message ) => { 
      this.fairCopySession.checkIn(email, serverURL, projectID, checkInResources, message)
    })

    ipcMain.on('checkOut', (event, email, serverURL, projectID, resourceIDs ) => { 
      this.fairCopySession.checkOut(email, serverURL, projectID, resourceIDs)
    })

    ipcMain.on('requestSaveConfig', (event,fairCopyConfig) => { this.fairCopySession.saveFairCopyConfig(fairCopyConfig) })    
    ipcMain.on('requestExportConfig', (event,exportPath,fairCopyConfig) => { this.fairCopySession.exportFairCopyConfig(exportPath,fairCopyConfig) })
    ipcMain.on('updateProjectInfo', (event,projectInfo) => { this.fairCopySession.updateProjectInfo(projectInfo) })
    
    ipcMain.on('requestPaste', (event) => { 
      if( this.mainWindow ) {
          this.mainWindow.webContents.paste()
      }
    })

    ipcMain.on('requestImport', (event,options) => { 
      const paths = this.mainMenu.openImport()
      if( paths ) {
        this.fairCopySession.importStart(paths,options)
      }
    })

    ipcMain.on('requestExport', (event, resourceEntries) => { 
      const paths = this.mainMenu.openExport()
      const path = paths ? paths[0] : null
      if( path ) {
        this.fairCopySession.requestExport(resourceEntries,path)
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
      createProjectArchive({ ...projectInfo, generatedWith: this.config.version}, this.baseDir, () => {
        this.openProject(projectInfo.filePath)
      })
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
    this.projectWindow = await this.createWindow('project-window-preload.js', 740, 570, false, '#E6DEF9' ) 
    this.projectWindow.webContents.send('appConfig', this.config)
  }  

  async createImageWindow(imageViewInfo) {
    const imageView = await this.createWindow('image-window-preload.js', 800, 600, true, '#fff' )
    const {resourceID, xmlID} = imageViewInfo
  
    this.imageViews[resourceID] = imageView

    imageView.on('close', (event) => {
      delete this.imageViews[resourceID]
    })

    this.fairCopySession.openResource( resourceID, xmlID )
  }

  exitApp() {
    if( !this.exiting ) {
      this.exiting = true

      for( const imageView of Object.values(this.imageViews) ) {
        if( !imageView.isDestroyed() ) {
          imageView.close()
        }
      }
      this.imageViews = {}

      if( this.returnToProjectWindow ) {
        this.createProjectWindow().then(() => {
          this.returnToProjectWindow = false
          this.exiting = false
        })
      } 

      if( this.mainWindow ) {
        this.mainWindow.close()
        this.fairCopySession.closeProject()
      }
    }
  }

  openProject(targetFile) {
    this.createMainWindow().then(() => {
      if( this.projectWindow ) {
        this.projectWindow.close()
        this.projectWindow = null  
      }
      this.fairCopySession = new FairCopySession(this, targetFile)
      log.info(`Opened project: ${targetFile}`)
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
    for( const imageView of Object.values(this.imageViews) ) {
      imageView.webContents.send(message, params)
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
      minWidth: 1024,
      minHeight: 768,
      webPreferences: {
          webSecurity,
          enableRemoteModule: false,
          nodeIntegration: true,
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