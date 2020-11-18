const { app, BrowserWindow, ipcMain, protocol } = require('electron')
const { autoUpdater } = require('electron-updater')
const { ProjectStore, createProjectArchive } = require('./ProjectStore')
const { MainMenu } = require('./MainMenu')
const fs = require('fs')
const Jimp = require("jimp")
const log = require('electron-log')
const { platform } = process

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
    distConfig.version = this.isDebugMode() ? "0.0.0" : app.getVersion()
    return distConfig
  }

  isDebugMode() {
    return ( process.env.FAIRCOPY_DEBUG_MODE !== undefined && process.env.FAIRCOPY_DEBUG_MODE !== false && process.env.FAIRCOPY_DEBUG_MODE !== 'false' )   
  }

  // local file protocol for accessing cache files in the temp dir 
  initLocalFileProtocol() {
    const protocolName = 'local'

    protocol.registerFileProtocol(protocolName, (request, callback) => {
      const relativeURL = request.url.replace(`${protocolName}://`, '').replace('..','')
      const safePath = `${this.projectStore.tempDir}/${relativeURL}`
      if( fs.existsSync(safePath) ) {
        try {
          return callback(decodeURIComponent(safePath))
        }
        catch (error) {
          log.error(error)
        }  
      } else {
        log.error(`Requested file does not exist: ${safePath}`)
      }
    })
  }

  initIPC() {
    
    // Common events ////
    ipcMain.on('checkForUpdates', (event,licenseData) => { this.checkForUpdates(licenseData) })
    ipcMain.on('exitApp', (event) => { 
      if( this.projectWindow ) {
        this.projectWindow.close() 
      } else {
        this.exitApp() 
      }
    })
  
    // Main window events //////

    ipcMain.on('requestResource', (event,resourceID) => { 
      this.projectStore.openResource(resourceID).then(()=>{
        log.info(`opened resourceID: ${resourceID}`)
      }) 
    })
    ipcMain.on('requestSave', (event,resourceID, resourceData) => { this.projectStore.saveResource(resourceID,resourceData) })
    ipcMain.on('addResource', (event, resourceEntry, resourceData) => { this.projectStore.addResource(resourceEntry,resourceData) })
    ipcMain.on('removeResource', (event, resourceID) => { this.projectStore.removeResource(resourceID) })
    ipcMain.on('updateResource', (event, resourceEntry) => { this.projectStore.updateResource(resourceEntry) })
    ipcMain.on('requestSaveConfig', (event,fairCopyConfig) => { this.projectStore.saveFairCopyConfig(fairCopyConfig) })
    ipcMain.on('requestSaveIDMap', (event,idMap) => { this.projectStore.saveIDMap(idMap) })
    ipcMain.on('requestImageURL', (event, resourceID) => { this.projectStore.openImageResource(resourceID) })
    ipcMain.on('updateProjectInfo', (event,projectInfo) => { this.projectStore.updateProjectInfo(projectInfo) })

    ipcMain.on('requestImport', (event) => { 
      const paths = this.mainMenu.openImport()
      const path = paths ? paths[0] : null
      if( path ) {
        const data = fs.readFileSync(path).toString('utf-8')
        const importData = { path, data }
        this.sendToMainWindow('importOpened', importData )  
      }
    })

    ipcMain.on('requestImageData', (event) => {
      const paths = this.mainMenu.openAddImage()
      this.processImageData(paths).then((imageData) => {
        this.sendToMainWindow('imagesOpened', imageData )  
      })     
    })

    ipcMain.on('requestExport', (event, exportOptions) => { 
      const paths = this.mainMenu.openExport()
      const path = paths ? paths[0] : null
      if( path ) {
        this.projectStore.exportResources(exportOptions,path).then( () => { 
          log.info(`Resources exported.`)
        })
      }
    })

    ipcMain.on('requestImageView', (event, imageViewInfo) => { 
      this.createImageWindow(imageViewInfo).then( () => { 
        log.info(`Opened image view.`)
      })
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

    // TODO Image Window Events ////
  
  }

  async createMainWindow() {
    this.projectStore = new ProjectStore(this)

    if( this.mainWindow ) {
      if( !this.mainWindow.isDestroyed() ) {
        this.mainWindow.destroy()
      }
      this.mainWindow = null
    }

    this.mainWindow = await this.createWindow('main-window-preload.js', 1440, 900, true, '#fff', true )

    // let render window handle on close (without browser restrictions)
    this.mainWindow.on('close', (event) => {
      if( !this.exiting ) {
        this.sendToMainWindow('requestExitApp')
        event.preventDefault()
      }     
    })
  }

  async createProjectWindow() {
    this.projectWindow = await this.createWindow('project-window-preload.js', 740, 500, false, '#E6DEF9' )
    this.projectWindow.webContents.send('appConfig', this.config)
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
          if( !imageView.isDestroyed() ) {
            imageView.close()
          }
        }
        this.imageViews = []

        if( this.returnToProjectWindow ) {
          this.createProjectWindow().then(() => {
            this.returnToProjectWindow = false
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

  checkForUpdates( licenseData ) {
    if( !this.autoUpdaterStarted ) {
      const { licenseKey, machineID, activated } = licenseData

      // Don't ask for updates if machine isn't activated
      if( !activated ) return

      autoUpdater.on('error', err => {
        log.info(`Autoupdate: ${err}`)
      })
  
      autoUpdater.on('update-downloaded', (...args) => {
        log.info('Autoupdate: update downloaded, ready to restart.')  
        // TODO need a button on interface to trigger this
        // autoUpdater.quitAndInstall()
      })

      autoUpdater.on('update-available', () => {
        log.info('Autoupdate: update available, downloading.')  
      }) 
  
      const productID = this.config.devMode ? this.config.devChannelID : this.config.productionChannelID
      const keygenDistURL = `https://dist.keygen.sh/v1/${this.config.keyGenAccountID}/${productID}/releases/${platform}?key=${licenseKey}&fingerprint=${machineID}`
      autoUpdater.setFeedURL({
        url: keygenDistURL,
        useMultipleRangeRequest: false,
        provider: 'generic',
        channel: 'latest'
      })  
      this.autoUpdaterStarted = true

      log.info('Autoupdate: Checking for updates...')
      autoUpdater.logger = log
      autoUpdater.checkForUpdatesAndNotify()
    }
  }

  sendToMainWindow(message, params) {
    this.mainWindow.webContents.send(message, params)
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