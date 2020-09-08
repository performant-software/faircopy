import React, { Component } from 'react'
import MainWindow from './MainWindow'
import ImageWindow from './ImageWindow'
import ProjectWindow from './ProjectWindow'
import LicenseWindow from './LicenseWindow'

import FairCopyProject from '../tei-document/FairCopyProject'
import ImageView from '../tei-document/ImageView'
import { initLicenseData } from '../tei-document/license-key.js'

const fairCopy = window.fairCopy

export default class App extends Component {

  constructor(props) {
    super(props)

    const licenseDataJSON = localStorage.getItem('licenseData')
    const licenseData = licenseDataJSON ? JSON.parse(licenseDataJSON) : initLicenseData()

    this.state = {
      fairCopyProject: null,
      licenseData,
      imageView: null
    }
  }

  componentDidMount() {
    const { services } = fairCopy
    const { licenseData } = this.state

    // tell main process to check for updates 
    if( licenseData.activated ) {
      services.ipcSend( 'checkForUpdates', licenseData )
    } else {
      this.setTitle('Activate License')
      return
    }

    this.initRootComponent()
  }

  initRootComponent() {
    const { rootComponent, services } = fairCopy

    if( rootComponent === 'ProjectWindow' ) {
      this.setTitle('Select Project')
    } 

    // Receive open and save file events from the main process
    if( rootComponent === 'MainWindow' ) {
      services.ipcRegisterCallback('projectOpened', (event, projectData) => this.openProject(projectData))
    } else if( rootComponent === 'ImageWindow' ) {
      services.ipcRegisterCallback('imageViewOpened', (event, imageViewData) => this.openImageView(imageViewData))
    }
  }

  setTitle( projectName ) {
      var titleEl = document.getElementsByTagName("TITLE")[0]
      titleEl.innerHTML = `FairCopy - ${projectName}`    
  }

  openProject( projectData ) {
    setTimeout( () => {
      const fairCopyProject = new FairCopyProject(projectData)
      this.setTitle(fairCopyProject.projectName)   
      this.setState({...this.state, fairCopyProject})
      this.addToRecentProjects(fairCopyProject)  
    },2000)
  }

  openImageView( imageViewData ) {
    setTimeout( () => {
      const imageView = new ImageView(imageViewData)
      this.setTitle('IMAGE TITLE')   
      this.setState({...this.state, imageView})
    },2000)
  }

  onActivate = () => {
    this.initRootComponent()
    const licenseData = JSON.parse(localStorage.getItem('licenseData'))
    this.setState({...this.state, licenseData })
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

  render() {
    const {fairCopyProject, imageView, licenseData } = this.state
    const {rootComponent} = window.fairCopy

    if( !licenseData.activated ) {
      return (
        <LicenseWindow
          onActivate={this.onActivate}
        ></LicenseWindow>
      )
    }

    if( rootComponent === "MainWindow" ) {
        return ( fairCopyProject &&
          <MainWindow
            fairCopyProject={fairCopyProject}
          ></MainWindow>
        ) 
    } else if( rootComponent === "ImageWindow" ) {
        return (
            <ImageWindow
              imageView={imageView}
            ></ImageWindow>
        )
    } else if( rootComponent === "ProjectWindow" ) {
      return (
          <ProjectWindow></ProjectWindow>
      )
    }

  }
}