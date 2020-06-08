// Modules to control application life and create native browser window
const { app } = require('electron')
const { FairCopyApplication } = require('./main-process/FairCopyApplication')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let fairCopyApplication

function createApplicationWindowManager () {
  const debugMode = false //process.env.FAIRCOPY_DEBUG_MODE
  fairCopyApplication = new FairCopyApplication()
  if( debugMode ) {
    fairCopyApplication.createMainWindow().then(() => {
      console.log("TEI Editor Ready - Loading example text.")   
      fairCopyApplication.projectStore.openProject('test-docs/example.faircopy')
    })
  } else {
    fairCopyApplication.createProjectWindow().then(() => {
      console.log("Project Window Ready")   
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
