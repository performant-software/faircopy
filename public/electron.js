// Modules to control application life and create native browser window
const { app } = require('electron')
const { ApplicationWindowManager } = require('./main-process/ApplicationWindowManager')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let appWindowManager

const onMainWindowClose = () => {
  appWindowManager = null
}

function createApplicationWindowManager () {
  let debugMode = ( process.argv[3] === 'debug' )
  appWindowManager = new ApplicationWindowManager(app, debugMode, onMainWindowClose)
  if( debugMode ) {
    appWindowManager.createTEIEditorWindow('test-docs/je_example.xml').then(() => {
      console.log("TEI Editor Ready - Loading example text.")   
    })
  } else {
    appWindowManager.createTEIEditorWindow().then(() => {
      console.log("TEI Editor Ready")   
    })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createApplicationWindowManager)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') app.quit()
  app.quit() // for now, just quit on all platforms
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (appWindowManager === null) createApplicationWindowManager()
})
