// Modules to control application life and create native browser window
const { app, protocol } = require('electron')
const { FairCopyApplication } = require('./main-process/FairCopyApplication')
const log = require('electron-log')

// Handle squirrelyness 
if( app.isPackaged && require('electron-squirrel-startup')) return;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let fairCopyApplication

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  },
  {
    scheme: 'ec',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
])

function createApplicationWindowManager () {
  const gotTheLock = app.requestSingleInstanceLock()

  // don't launch a second copy of the app
  if( gotTheLock ) {
    fairCopyApplication = new FairCopyApplication()
    log.info(`FairCopy ${app.getVersion()}`)
    fairCopyApplication.createProjectWindow().then(() => {
      log.info("Project Window Ready")   
    })  
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createApplicationWindowManager)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') app.quit()
  app.quit() // for now, just quit on all platforms
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (fairCopyApplication === null) createApplicationWindowManager()
})
