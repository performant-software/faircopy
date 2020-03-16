const { BrowserWindow, dialog, Menu, ipcMain } = require('electron')
const { isDebugMode } = require('./preload-services').services

// TODO detect PC
const isMac = true

const indexFilePath = 'build/index.html'
const debugBaseDir = `${process.cwd()}/public/main-process`
const distBaseDir = __dirname

class ApplicationWindowManager {

    constructor(app, onClose) {
        this.mainWindow = null
        this.noteWindows = {}
        this.app = app
        this.onClose = onClose
        this.baseDir = isDebugMode() ? debugBaseDir : distBaseDir
        const template = this.mainMenuTemplate()
        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)     
        ipcMain.on('openSaveFileDialog', this.saveFileMenu)
        ipcMain.on('createNoteEditorWindow', this.createNoteEditorWindow)
        ipcMain.on('closeNoteWindow', this.closeNoteWindow)
    }

    async createTEIEditorWindow(targetFile) {

      // Create the browser window.
      const browserWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        webPreferences: {
            enableRemoteModule: false,
            preload: `${this.baseDir}/main-window-preload.js`
        }
      })

      // Emitted when the window is closed.
      browserWindow.on('closed', this.onClose )

      // and load the index.html of the app.
      if( isDebugMode() ) {
        await browserWindow.loadURL('http://localhost:3000')
        browserWindow.webContents.openDevTools({ mode: 'bottom'} )
      } else {
        await browserWindow.loadFile(indexFilePath)
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
          parent: this.mainWindow,
          width: 700,
          height: 500,
          frame: false,
          webPreferences: {
              enableRemoteModule: false,
              preload: `${this.baseDir}/note-window-preload.js`
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
      if( isDebugMode() ) {
          browserWindow.loadURL('http://localhost:3000/index.html').then(loadNote)
      } else {
          browserWindow.loadFile(indexFilePath).then(loadNote)
      }

      // For now, there is only one document window
      this.noteWindows[noteID] = browserWindow
    }

    openFileMenu = () => {
        dialog.showOpenDialog( {
            properties: [ 'openFile' ]
        }).then(files => {
          if( files && files.filePaths.length > 0 ) {
            this.mainWindow.webContents.send('fileOpened', files.filePaths[0])
          }
        })
    }

    openPrintDialog = () => {
      this.mainWindow.webContents.send('openPrint')
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

    closeNoteWindow = (event, noteID) => {
      const noteWindow = this.noteWindows[noteID]

      if( noteWindow ) {
        noteWindow.close();
      }
    }

    requestNewFile = () => {
      this.mainWindow.webContents.send('fileNew')
    }

    requestSave = () => {
      this.mainWindow.webContents.send('requestSave')
    }

    requestSaveAs = () => {
      this.saveFileMenu()
    }

    mainMenuTemplate() {

      let viewSubMenu = [
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]

      if( this.debugMode ) {
        viewSubMenu = [ ...viewSubMenu, 
          { role: 'reload' },
          { role: 'forcereload' },
          { role: 'toggledevtools' }        
        ]
      } 

        return [
          // { role: 'appMenu' }
          ...(process.platform === 'darwin' ? [{
            label: this.app.name,
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
                label: 'New File...',
                accelerator: 'CommandOrControl+N',
                click: this.requestNewFile
              },
              { 
                label: 'Open...',
                accelerator: 'CommandOrControl+O',
                click: this.openFileMenu
              },
              // { 
              //   label: 'Print...',
              //   accelerator: 'CommandOrControl+P',
              //   click: this.openPrintDialog
              // },
              { 
                label: 'Save',
                accelerator: 'CommandOrControl+S',
                click: this.requestSave
              },
              { 
                label: 'Save As...',
                click: this.requestSaveAs
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
            submenu: viewSubMenu
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
                label: 'About',
                click () { require('electron').shell.openExternalSync('https://www.performantsoftware.com') }
              }
            ]
          }
        ]
    }
}

exports.ApplicationWindowManager = ApplicationWindowManager