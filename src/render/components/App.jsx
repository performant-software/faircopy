import React, { Component } from 'react'
import { configure } from 'react-hotkeys'

import MainWindow from './main-window/MainWindow'
import ImageWindow from './image-window/ImageWindow'
import ProjectWindow from './project-window/ProjectWindow'
import PreviewWindow from './preview-window/PreviewWindow'
import IncompatDialog from './IncompatDialog'
import ProjectSettingsWindow from './project-settings-window/ProjectSettingsWindow'

import FairCopyProject from '../model/FairCopyProject'
import ImageView from '../model/ImageView'
import { getConfigStatus } from '../model/faircopy-config'


const fairCopy = window.fairCopy

export default class App extends Component {

  constructor(props) {
    super(props)

    this.state = {
      fairCopyProject: null,
      incompatInfo: null,
      imageView: null,
      previewView: null,
      appConfig: null,
      checkingOut: false,
      checkOutError: null,
      projectSettingsActive: false
    }

    this.mainWindowRef = React.createRef()
  }

  onAppConfig = (event, appConfig) => {
    this.setState({ ...this.state, appConfig })
  }

  onFairCopyConfigCheckedOut = ( e, resp ) => {
    const { fairCopyProject } = this.state
    const { status } = resp

    if( status === 'success' ) {
      fairCopyProject.configCheckedOut()
      this.setState( { ...this.state, checkOutError: null, checkingOut: false } )
    } else {
      //error reporting here
      this.setState( { ...this.state, checkOutError: status, checkingOut: false } )
    }
  }

  onUpdateFairCopyConfig = ( e, configUpdate ) => {
    const { fairCopyProject } = this.state
    const { config, configLastAction } = configUpdate
    const lockStatus = getConfigStatus( configLastAction, fairCopyProject.userID )
    if( lockStatus !== 'checked_out' ) {
      fairCopyProject.saveFairCopyConfig( config, configLastAction )
      this.setState( { ...this.state } )
    } else {
      fairCopyProject.configLastAction = configLastAction
    }
  }

  componentDidMount() {
    const { rootComponent } = this.props
    fairCopy.ipcRegisterCallback('appConfig', this.onAppConfig )
    fairCopy.ipcRegisterCallback('fairCopyConfigCheckedOut', this.onFairCopyConfigCheckedOut )
    fairCopy.ipcRegisterCallback('updateFairCopyConfig', this.onUpdateFairCopyConfig )
    this.initRootComponent()        
  }

  componentWillUnmount() {
    fairCopy.ipcRemoveListener('appConfig', this.onAppConfig )
    fairCopy.ipcRemoveListener('fairCopyConfigCheckedOut', this.onFairCopyConfigCheckedOut )
    fairCopy.ipcRemoveListener('updateFairCopyConfig', this.onUpdateFairCopyConfig )
  }

  initRootComponent() {
    const { rootComponent } = this.props

    if( rootComponent === 'ProjectWindow' ) {
      this.setTitle('Select Project')
    } 

    // Receive open and save file events from the main process
    if( rootComponent === 'MainWindow' ) {
      fairCopy.ipcRegisterCallback('projectOpened', (event, projectData) => this.openProject(projectData))
      fairCopy.ipcRegisterCallback('projectIncompatible', (event, incompatInfo) => this.setState({ ...this.state, incompatInfo }) )

      // configure hot keys to accept input from all element types
      configure({ ignoreEventsCondition: () => false })      
    } else if( rootComponent === 'ImageWindow' ) {
      fairCopy.ipcRegisterCallback('imageViewOpened', (event, imageViewData) => this.openImageView(imageViewData))
    } else if( rootComponent === 'PreviewWindow' ) {
      fairCopy.ipcRegisterCallback('previewViewOpened', (event, previewData) => this.openPreviewView(previewData))
    }
  }

  setTitle( projectName ) {
      var titleEl = document.getElementsByTagName("TITLE")[0]
      titleEl.innerHTML = projectName ? `FairCopy - ${projectName}` : 'Image Detail'
  }

  openProject( projectData ) {
    // This timeout is here because pre-first render code paths in app initialization can 
    // get out ahead of the browser's debugger, causing
    // breakpoints not to be honored. Only needed for debugging these paths.
    // setTimeout( () => {
      const fairCopyProject = new FairCopyProject(projectData)
      this.setTitle(fairCopyProject.projectName)   
      this.setState({...this.state, fairCopyProject})
      this.addToRecentProjects(fairCopyProject)  
    // },2000)
  }

  openImageView( imageViewData ) {
    // setTimeout( () => {
      const imageView = new ImageView(imageViewData)
      const title = imageView.resourceEntry.name
      this.setTitle(title)   
      this.setState({...this.state, imageView})
    // },2000)
  }

  openPreviewView( previewView ) {
      // setTimeout( () => {
        this.setTitle(previewView.resourceEntry.name)   
        this.setState({...this.state, previewView})
      // },2000)  
  }

  // record this as a recent project
  addToRecentProjects( fairCopyProject ) {
    let projects = localStorage.getItem('recentProjects');
    projects = projects ? JSON.parse(projects) : []

    const { projectName, description, projectFilePath } = fairCopyProject
    const nextEntry = { projectName, description, projectFilePath, lastAccess: Date.now() }

    let nextProjects = []
    for( const project of projects ) {
      if( project.projectFilePath !== projectFilePath ) {
        nextProjects.push(project)
      }
    }
    nextProjects.push(nextEntry)

    // only record the three most recent
    nextProjects = nextProjects.sort((a,b)=>(b.lastAccess - a.lastAccess)).slice(0,3)
    localStorage.setItem('recentProjects', JSON.stringify(nextProjects));
  }

  refreshMainWindow() {
    setTimeout( () => { this.mainWindowRef.current.refreshWindow() }, 100 )
  }

  render() {
    const { fairCopyProject, imageView, previewView, appConfig, incompatInfo, projectSettingsActive, checkingOut, checkOutError } = this.state
    const {rootComponent} = this.props

    if( incompatInfo ) {
      const { projectFilePath, projectFileVersion } = incompatInfo
      return (
        <IncompatDialog
          projectFilePath={projectFilePath}
          projectFileVersion={projectFileVersion}
        ></IncompatDialog>
      )
    }

    const onClose = () => {
      this.setState( { ...this.state, projectSettingsActive: false } )
      this.refreshMainWindow()
    }

    const onSave = ( fairCopyConfig, projectInfo ) => {
      const { fairCopyProject } = this.state
      fairCopyProject.saveFairCopyConfig( fairCopyConfig )
      fairCopyProject.updateProjectInfo( projectInfo )
      this.setState( { ...this.state, projectSettingsActive: false } )
      this.refreshMainWindow()
    }

    const onCheckOut = () => {
      const { fairCopyProject } = this.state
      const done = fairCopyProject.checkOutConfig()
      this.setState( { ...this.state, checkingOut: !done } )
    }

    const onCheckIn = (fairCopyConfig) => {
      fairCopyProject.checkInConfig( fairCopyConfig )
      this.setState( { ...this.state } )
    }

    if( rootComponent === "MainWindow" && fairCopyProject ) {
      return (
        <div lang="en">
          { projectSettingsActive && <ProjectSettingsWindow
            fairCopyProject={fairCopyProject}
            checkingOut={checkingOut}
            checkOutError={checkOutError}
            onSave={ onSave }
            onCheckOut={ onCheckOut }
            onCheckIn={ onCheckIn }
            onClose={ onClose }
          ></ProjectSettingsWindow> }
          <MainWindow
            appConfig={appConfig}
            hidden={projectSettingsActive}
            onProjectSettings={ ()=> { this.setState( { ...this.state, projectSettingsActive: true } )}}
            fairCopyProject={fairCopyProject}
            ref={this.mainWindowRef}
          ></MainWindow>
        </div>
      )
    } else if( rootComponent === "ImageWindow" && imageView ) {
        return (
            <ImageWindow
              imageView={imageView}
            ></ImageWindow>
        )
    } else if( rootComponent === "PreviewWindow" && previewView ) {
        const { resourceEntry, layers, layerID, projectCSS, validModes } = previewView
        return (
            <PreviewWindow
              resourceEntry={resourceEntry} 
              layers={layers}
              layerID={layerID}
              projectCSS={projectCSS}
              validModes={validModes}
            ></PreviewWindow>
        )
    } else if( rootComponent === "ProjectWindow" ) {
      return (
          <ProjectWindow
            appConfig={appConfig}
          ></ProjectWindow>
      )
    } 
    else return null

  }
}