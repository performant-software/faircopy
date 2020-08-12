const { BrowserWindow, autoUpdater, ipcMain } = require('electron')
const { ProjectStore, createProjectArchive } = require('./ProjectStore')
const { MainMenu } = require('./MainMenu')
const fs = require('fs')

const indexFilePath = 'build/index.html'
const debugBaseDir = `${process.cwd()}/public/main-process`
const distBaseDir = __dirname

// Configuration for Keygen Dist
const accountID = "8a8d3d6a-ab09-4f51-aea5-090bfd025dd8"
const productID = "495ce69f-3f29-44aa-aae2-718ed4eeb0d5"

class FairCopyApplication {

  constructor() {
    this.mainWindow = null
    this.imageViews = []
    // this.noteWindows = {}
    this.baseDir = this.isDebugMode() ? debugBaseDir : distBaseDir
    this.versionNumber = this.getVersionNumber()
    this.mainMenu = new MainMenu(this)
    this.exiting = false
    this.returnToProjectWindow = false
    this.autoUpdaterStarted = false
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

    if( this.mainWindow ) {
      if( !this.mainWindow.isDestroyed() ) {
        this.mainWindow.destroy()
      }
      this.mainWindow = null
    }

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
    ipcMain.on('updateProjectInfo', (event,projectInfo) => { this.projectStore.updateProjectInfo(projectInfo) })
    ipcMain.on('checkForUpdates', (event,licenseData) => { this.checkForUpdates(licenseData) })
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

    this.mainWindow = await this.createWindow('main-window-preload.js', 1440, 900, true, '#fff', true )

    // let render window handle on close (without browser restrictions)
    this.mainWindow.on('close', (event) => {
      if( !this.exiting ) {
        this.sendToMainWindow('requestExitApp')
        event.preventDefault()
      } else {
        this.exiting = false
      }
    })
  }

  async createProjectWindow() {

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
    
    ipcMain.on('checkForUpdates', (event,licenseData) => { this.checkForUpdates(licenseData) })
    ipcMain.on('exitApp', (event) => { this.projectWindow.close() })

    this.projectWindow = await this.createWindow('project-window-preload.js', 740, 500, true, '#E6DEF9', true )
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
          ipcMain.removeAllListeners()
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
        console.log(`Opened project: ${targetFile}`)
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
        // TODO if the user isn't authorized, de-activate this computer
        console.log(`Autoupdate: ${err}`)
      })
  
      autoUpdater.on('update-downloaded', (...args) => {
        console.log('Autoupdate: update downloaded, ready to restart.')  
        autoUpdater.quitAndInstall()
      })

      autoUpdater.on('update-available', () => {
        console.log('Autoupdate: update available, downloading.')  
      }) 
  
      const keygenDistURL = `https://dist.keygen.sh/v1/${accountID}/${productID}/latest/macos/dmg?key=${licenseKey}&fingerprint=${machineID}`
      autoUpdater.setFeedURL(keygenDistURL)  
      this.autoUpdaterStarted = true

      console.log('Autoupdate: Checking for updates...')
      autoUpdater.checkForUpdates()
    }
  }

  sendToMainWindow(message, params) {
    this.mainWindow.webContents.send(message, params)
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