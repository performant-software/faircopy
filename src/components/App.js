import React, { Component } from 'react'
import MainWindow from './MainWindow'
import NoteWindow from './NoteWindow'
import GraphWindow from './GraphWindow'

import FairCopyProject from '../tei-document/FairCopyProject'

const fairCopy = window.fairCopy

const untitledDocumentTitle = "Untitled Document"

export default class App extends Component {

  constructor(props) {
    super(props)

    this.state = {
      fairCopyProject: null
    }
  }


// openPrint() {
//     window.print()
// }

// newFile() {
//     const { teiDocument, exitAnyway } = this.state
//     const { changedSinceLastSave } = teiDocument

//     if( !exitAnyway && changedSinceLastSave ) {
//         this.setState({ ...this.state, alertDialogMode: 'new'})
//         teiDocument.changedSinceLastSave = false 
//     } else {
//         const { editorView } = teiDocument
//         const newEditorState = teiDocument.editorInitialState(document)
//         editorView.updateState( newEditorState )       
//         teiDocument.changedSinceLastSave = false 
//         this.setTitle(untitledDocumentTitle)
//         editorView.focus();
//         this.setState( { 
//             ...this.state, 
//             exitAnyway: false, 
//             alertDialogMode: false, 
//             filePath: null 
//         })    
//     }
// }

// openFile( filePath ) {
//     const { teiDocument } = this.state
//     const newEditorState = teiDocument.load(filePath)
//     if( newEditorState ) {
//         const {editorView} = teiDocument
//         editorView.updateState( newEditorState )        
//         this.setTitle(filePath)
//         editorView.focus();
//         this.setState( { ...this.state, filePath })    
//     } else {
//         console.log(`Unable to load file: ${filePath}`)
//     }
// }

// requestSave = () => {
//     const { filePath } = this.state
//     if( filePath === null ) {
//         fairCopy.services.ipcSend( 'openSaveFileDialog' )
//     } else {
//         this.save(filePath)
//     }
// }

// save(saveFilePath) {
//     const { teiDocument } = this.state
//     teiDocument.save( saveFilePath )
//     this.setState( { ...this.state, 
//         filePath: saveFilePath, 
//         alertDialogMode: false, 
//         exitAnyway: false
//     })

//     this.setTitle(saveFilePath)
// }

  componentDidMount() {
    const {services} = fairCopy

    this.setTitle(null)

    // Receive open and save file events from the main process
    services.ipcRegisterCallback('fileOpened', (event, filePath) => this.openFile(filePath))
    // services.ipcRegisterCallback('requestSave', () => this.requestSave())        
    // services.ipcRegisterCallback('fileSaved', (event, filePath) => this.save(filePath))      
    // services.ipcRegisterCallback('fileNew', (event) => this.newFile() )
    // services.ipcRegisterCallback('openPrint', (event) => this.openPrint() )
    services.initConfigClient()
  }

  setTitle( filePath ) {
    let title
    if( filePath ) {
        const filename = filePath.replace(/^.*[\\/]/, '')
        title = `${filename}`    
    } else {
        title = untitledDocumentTitle
    }
    var titleEl = document.getElementsByTagName("TITLE")[0]
    titleEl.innerHTML = title
  }

  openProject( projectPath ) {
    const fairCopyProject = new FairCopyProject(projectPath)      
    this.setState({...this.state, fairCopyProject})
  }

  openFile( filePath ) {
      // TODO refactor
      this.openProject('test-docs/test-project')
  }
  
  render() {
    const {fairCopyProject} = this.state
    const {rootComponent} = window.fairCopy

    if( rootComponent === "MainWindow" ) {
        return ( fairCopyProject &&
          <MainWindow
            fairCopyProject={fairCopyProject}
          ></MainWindow>
        ) 
    } else if( rootComponent === "NoteWindow" ) {
        return (
            <NoteWindow></NoteWindow>
        )
    } else {
      return (
        <GraphWindow></GraphWindow>
      )
    }

  }
}