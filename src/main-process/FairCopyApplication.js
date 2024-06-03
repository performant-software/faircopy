const { app, BrowserWindow, ipcMain, protocol, shell } = require('electron')
const { createProjectArchive } = require('./create-project-archive')
const { MainMenu } = require('./MainMenu')
const fs = require('fs')
const path = require('node:path')
const Jimp = require("jimp")
const log = require('electron-log')

const { FairCopySession } = require('./FairCopySession')

const debugBaseDir = `${process.cwd()}/src`
const distBaseDir = __dirname 

class FairCopyApplication {

  constructor() {
    this.mainWindow = null
    this.previewView = null
    this.fairCopySession = null
    this.imageViews = {}
    this.exiting = false
    this.returnToProjectWindow = false
    this.autoUpdaterStarted = false

    this.baseDir = !app.isPackaged ? debugBaseDir : distBaseDir
    this.config = this.getConfig()
    
    this.mainMenu = new MainMenu(this)
    this.initFileProtocol()
    this.initIPC()
  }

  getConfig() {
    const distConfig = {}
    distConfig.devMode = !app.isPackaged
    distConfig.releaseNotes = fs.readFileSync(`${this.baseDir}/release-notes/latest.md`).toString('utf-8')
    distConfig.defaultProjectCSS = fs.readFileSync(`${this.baseDir}/config/default-project-css.css`).toString('utf-8')
    distConfig.version = app.isPackaged ? app.getVersion() : process.env.FAIRCOPY_DEV_VERSION
    return distConfig
  }

  initFileProtocol() {
    protocol.handle('file', async (request) => {
      const url = request.url
      // handle editioncrafter asset requests
      if( url.startsWith('file://ec')) {
        const content = this.fairCopySession.requestEditionCrafterData(url)
        return new Response(content, {
          headers: { 'content-type': 'text/html' }
        })  
      // handle local image resource requests
      } else if( url.startsWith('file://images') ) {
        // TODO ... need localPath
        // this.fairCopySession.openImageResource(request.url)
        // return net.fetch(pathToFileURL(localPath).toString())  
      } else {
        // TODO ignore any other reqs
      }
    })
  }

  initIPC() {
    
    ipcMain.on('closeProject', (event) => { 
      this.closeProject()
      this.exitApp()
    })

    ipcMain.on('openWebpage', (event, url ) => {
      shell.openExternal(url)
    })  
    
    ipcMain.on('exitApp', (event) => { 
      if( this.projectWindow ) {
        this.projectWindow.close() 
      } else {
        this.exitApp() 
      }
    })

    ipcMain.on('reopenProject', (event) => {
      this.fairCopySession.reopenProject() 
    })
    
    ipcMain.on('addResource', (event, resourceEntry, resourceData, resourceMap) => { this.fairCopySession.addResource(resourceEntry,resourceData,resourceMap) })

    ipcMain.on('replaceTEIDocument', (event, resources) => { this.fairCopySession.replaceTEIDocument(resources) })
    ipcMain.on('replaceResource', (event, resource, parentEntry) => { this.fairCopySession.replaceResource(resource,parentEntry) })

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

    ipcMain.on('requestLocalResources', (event) => { 
      this.fairCopySession.requestLocalResources() 
    })
    
    ipcMain.on('searchProject', (event, searchQuery) => { 
      this.fairCopySession.searchProject(searchQuery)  
    })
    ipcMain.on('requestSave', (event, msgID, resourceID, resourceData) => { 
      const ok = this.fairCopySession.saveResource(resourceID, resourceData, !!this.previewView) 
      if( ok ) {
        const update = { resourceID, messageID: msgID, resourceContent: resourceData }        
        this.sendToAllWindows('resourceContentUpdated', update )
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

    ipcMain.on('checkIn', (event, userID, serverURL, projectID, checkInResources, message ) => { 
      this.fairCopySession.checkIn(userID, serverURL, projectID, checkInResources, message)
    })

    ipcMain.on('checkOut', (event, userID, serverURL, projectID, resourceIDs ) => { 
      this.fairCopySession.checkOut(userID, serverURL, projectID, resourceIDs)
    })

    ipcMain.on('requestSaveConfig', (event,fairCopyConfig,lastAction) => { this.fairCopySession.saveFairCopyConfig(fairCopyConfig,lastAction) })    
    ipcMain.on('checkInConfig', (event,fairCopyConfig,firstAction) => { this.fairCopySession.checkInConfig(fairCopyConfig,firstAction) })        
    ipcMain.on('checkOutConfig', (event) => { this.fairCopySession.checkOutConfig() })        
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

    ipcMain.on('requestIIIFImport', (event, importList) => { 
        this.fairCopySession.importIIIFStart(importList)
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

    ipcMain.on('requestPreviewView', (event, previewData) => { 
      // if the preview window already exists, move it to the front
      if( this.previewView ) {
        this.previewView.focus()
      }
      this.fairCopySession.requestPreviewView(previewData)
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
      createProjectArchive({ ...projectInfo, defaultProjectCSS: this.config.defaultProjectCSS, generatedWith: this.config.version}, this.baseDir, () => {
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

    const windowSize = this.config.devMode ? [1440,1200] : [1440,900]
    this.mainWindow = await this.createWindow('main-window', ...windowSize, true, '#fff', true, true )
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
    this.projectWindow = await this.createWindow('project-window', 740, 570, false, '#E6DEF9', false ) 
    this.projectWindow.webContents.send('appConfig', this.config)
  }  

  async createPreviewWindow(previewData) {
    if( !this.previewView ) {
      const windowSize = this.config.devMode ? [1440,1200] : [1440,900]
      this.previewView = await this.createWindow('preview-window', ...windowSize, true, '#fff', false, true )
      this.previewView.on('close', e => delete this.previewView )
      this.previewView.webContents.send('previewViewOpened', previewData)
    } else {
      this.previewView.webContents.send('updatePreview', previewData)
    }
  }

  async createImageWindow(imageViewInfo) {
    const imageView = await this.createWindow('image-window', 1024, 768, true, '#fff', false )
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

      if( this.previewView ) {
        this.previewView.close()
        this.previewView = null
      }

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

  async createWindow(windowName, width, height, resizable, backgroundColor, menuBar, devTools ) {

    // Since dev mode is loaded via localhost, disable web security so we can use file:// urls.
    // const webSecurity = app.isPackaged
    const preload = path.join(this.baseDir, `${windowName}-preload.js`) 
    
    // Create the browser window.
    const browserWindow = new BrowserWindow({
      width,
      height,
      minWidth: 1024,
      minHeight: 768,
      webPreferences: {
          // webSecurity,
          enableRemoteModule: false,
          preload,
          spellcheck: false
      },

      autoHideMenuBar: !menuBar,
      resizable,
      backgroundColor
    })

    // and load the index.html of the app.
    switch( windowName ) {
      case 'main-window':
        browserWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
        break
      case 'project-window':
        browserWindow.loadURL(PROJECT_WINDOW_WEBPACK_ENTRY);
        break
      case 'preview-window':
        browserWindow.loadURL(PREVIEW_WINDOW_WEBPACK_ENTRY);
        break
      case 'image-window':
        browserWindow.loadURL(IMAGE_WINDOW_WEBPACK_ENTRY);
        break
    }

    // Open the DevTools.
    // if( devTools ) 
      browserWindow.webContents.openDevTools();

    return browserWindow
  }
}

exports.FairCopyApplication = FairCopyApplication