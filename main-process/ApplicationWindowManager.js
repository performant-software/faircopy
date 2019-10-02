const { BrowserWindow, dialog, Menu, ipcMain } = require('electron')

// TODO detect PC
const isMac = true

class ApplicationWindowManager {

    constructor(app, debugMode, onClose) {
        this.mainWindow = null
        this.noteWindows = {}
        this.app = app
        this.onClose = onClose
        this.debugMode = debugMode
        const template = this.mainMenuTemplate()
        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)     
        ipcMain.on('openSaveFileDialog', this.saveFileMenu)
        ipcMain.on('createNoteEditorWindow', this.createNoteEditorWindow)
    }

    async createTEIEditorWindow(targetFile) {

      // Create the browser window.
      const browserWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        webPreferences: {
            nodeIntegration: true
        }
      })

      // Emitted when the window is closed.
      browserWindow.on('closed', this.onClose )

      // and load the index.html of the app.
      if( this.debugMode ) {
        await browserWindow.loadURL('http://localhost:3000')
        browserWindow.webContents.openDevTools({ mode: 'bottom'} )
      } else {
        await browserWindow.loadFile('../../../../../../../build/index.html')
      }

      // send message indicating the target file
      if( targetFile ) {
        browserWindow.webContents.send('fileOpened', targetFile )
      }

      // For now, there is only one document window
      this.mainWindow = browserWindow
    }

    createNoteEditorWindow = (event, noteID) => {

      if( this.noteWindows[noteID] ) {
        this.noteWindows[noteID].focus()
        console.log("Window already open for note.")
        // TODO set focus on this windo
        return
      }

      // Create the browser window
      const browserWindow = new BrowserWindow({
          width: 700,
          height: 500,
          frame: false,
          webPreferences: {
              nodeIntegration: true
          }
      })

      // Emitted when the note window is closed.
      browserWindow.on('closed', () => {
        this.noteWindows[noteID] = null
      } )

      const loadNote = () => {
        // send message indicating the target note
        browserWindow.webContents.send('noteOpened', noteID)
      }

      // and load the index.html of the app.
      if( this.debugMode ) {
          browserWindow.loadURL('http://localhost:3000').then(loadNote)
      } else {
          browserWindow.loadFile('../../../../../../../build/index.html').then(loadNote)
      }

      // For now, there is only one document window
      this.noteWindows[noteID] = browserWindow
    }

    openFileMenu = () => {
        dialog.showOpenDialog( {
            properties: [ 'openFile' ]
        }, (files) => {
          if( files && files.length > 0 ) {
            this.mainWindow.webContents.send('fileOpened', files[0])
          }
        })
    }

    saveFileMenu = () => {
      dialog.showSaveDialog( {
          properties: [ 'openFile', 'createDirectory' ]
      }, (files) => {
        if( files && files.length > 0 ) {
          this.mainWindow.webContents.send('fileSaved', files)
        }
      })   
    }

    requestSave = () => {
      this.mainWindow.webContents.send('requestSave')
    }

    mainMenuTemplate() {
        return [
          // { role: 'appMenu' }
          ...(process.platform === 'darwin' ? [{
            label: this.app.getName(),
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideothers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }] : []),
          // { role: 'fileMenu' }
          {
            label: 'File',
            submenu: [
              { 
                label: 'Open',
                accelerator: 'CommandOrControl+O',
                click: this.openFileMenu
              },
              { 
                label: 'Save',
                accelerator: 'CommandOrControl+S',
                click: this.requestSave
              },
              { role: 'close' }
            ]
          },
          // { role: 'editMenu' }
          {
            label: 'Edit',
            submenu: [
              { role: 'undo' },
              { role: 'redo' },
              { type: 'separator' },
              { role: 'cut' },
              { role: 'copy' },
              { role: 'paste' },
              ...(isMac ? [
                { role: 'pasteAndMatchStyle' },
                { role: 'delete' },
                { role: 'selectAll' },
                { type: 'separator' },
                {
                  label: 'Speech',
                  submenu: [
                    { role: 'startspeaking' },
                    { role: 'stopspeaking' }
                  ]
                }
              ] : [
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
              ])
            ]
          },
          // { role: 'viewMenu' }
          {
            label: 'View',
            submenu: [
              { role: 'reload' },
              { role: 'forcereload' },
              { role: 'toggledevtools' },
              { type: 'separator' },
              { role: 'resetzoom' },
              { role: 'zoomin' },
              { role: 'zoomout' },
              { type: 'separator' },
              { role: 'togglefullscreen' }
            ]
          },
          // { role: 'windowMenu' }
          {
            label: 'Window',
            submenu: [
              { role: 'minimize' },
              { role: 'zoom' },
              ...(isMac ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
              ] : [
                { role: 'close' }
              ])
            ]
          },
          {
            role: 'help',
            submenu: [
              {
                label: 'Learn More',
                click () { require('electron').shell.openExternalSync('https://electronjs.org') }
              }
            ]
          }
        ]
    }
}

exports.ApplicationWindowManager = ApplicationWindowManager