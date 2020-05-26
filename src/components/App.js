import React, { Component } from 'react'
import MainWindow from './MainWindow'
import NoteWindow from './NoteWindow'
import ProjectWindow from './ProjectWindow'

import FairCopyProject from '../tei-document/FairCopyProject'

const fairCopy = window.fairCopy

export default class App extends Component {

  constructor(props) {
    super(props)

    this.state = {
      fairCopyProject: null
    }
  }

  componentDidMount() {
    const { services, rootComponent } = fairCopy

    if( rootComponent === 'ProjectWindow' ) {
      this.setTitle('Select Project')
    } 

    // Receive open and save file events from the main process
    services.ipcRegisterCallback('fileOpened', (event, projectData) => this.openFile(projectData))
  }

  setTitle( projectName ) {
      var titleEl = document.getElementsByTagName("TITLE")[0]
      titleEl.innerHTML = `FairCopy - ${projectName}`    
  }

  openFile( projectData ) {
    const fairCopyProject = new FairCopyProject(projectData)   
    this.setTitle(fairCopyProject.projectName)   
    this.setState({...this.state, fairCopyProject})
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
    } else if( rootComponent === "ProjectWindow" ) {
      return (
          <ProjectWindow></ProjectWindow>
      )
    }

  }
}