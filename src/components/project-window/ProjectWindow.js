import React, { Component } from 'react'
import { Button, Typography, Card, CardContent, TextField, CardActionArea} from '@material-ui/core'

import LicensePanel from '../license-window/LicensePanel'
import { initLicenseData, licenseDaysLeft, activateLicense } from '../../model/license-key'

const fairCopy = window.fairCopy

export default class ProjectWindow extends Component {

    constructor() {
        super()
        this.initialState = { 
            mode: 'select', 
            projectName: '',
            description: '',
            filePath: ''
        }
        this.state = this.initialState
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('pathSelected', (event, filePath) => this.onPathUpdated(filePath))
    }

    onPathUpdated(filePath) {
        if( filePath ) {
            this.setState({...this.state, filePath })
        }
    }

    renderNewProject() {
        const onClickSave = () => {
            const { projectName, description, filePath } = this.state
            const projectInfo = { 
                name: projectName,
                description,
                filePath
            }
            fairCopy.services.ipcSend('requestNewProject', projectInfo )
        }
        const onClickCancel = () => {
            this.setState({ ...this.initialState })
        }
        const onClickBrowse = () => {
            fairCopy.services.ipcSend('requestNewPath' )
        }
        const onChangeName = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, projectName: value })
        }
        const onChangeDescription = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, description: value })
        }
        const { projectName, description, filePath } = this.state
        const saveAllowed = (projectName.length > 0 && filePath.length > 0 )
        const saveButtonClass = saveAllowed ? "save-button-active" : "action-button"

        return (
            <div className="content new-project-form">
                <Typography variant="h6" component="h2">Start a New Project</Typography>
                <ul>
                    <li>
                        <TextField 
                            className="new-project-field"
                            value={projectName}
                            onChange={onChangeName}
                            label="Project Name" 
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Short Description" 
                            onChange={onChangeDescription}
                            value={description}
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Project File" 
                            value={filePath}
                            disabled
                        />
                        <Button size='small' className='browse-button'onClick={onClickBrowse} variant='contained'>Choose Save File Path</Button>
                    </li>
                    <li><Typography className="instructions"><i className="far fa-lightbulb-on fa-lg"></i> Give your project and name and a short description, then choose where you want the project file to be saved.</Typography></li>
                </ul>
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onClickSave} color='primary' variant='contained'>Save</Button>
                    <Button className='action-button' onClick={onClickCancel} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }

    renderProjectCard(project) {
        const { projectName, description, projectFilePath } = project

        const onClick = () => {
            fairCopy.services.ipcSend('requestProject', projectFilePath )
        }

        return (
            <Card className='recent-project-card' key={`project-${projectFilePath}`} variant="outlined">
                <CardActionArea onClick={onClick}>
                    <CardContent>
                        <Typography><i className='fas fa-book'></i> {projectName}</Typography>
                        <Typography variant="body2">{description}</Typography>
                    </CardContent>
                </CardActionArea>
            </Card>
        )
    }
  
    renderSelectProject(allowKeyReset) {
        let projects = localStorage.getItem('recentProjects')
        projects = projects ? JSON.parse(projects) : []

        const onClickOpen = () => {
            fairCopy.services.ipcSend('requestFileOpen')
        }

        const onClickNew = () => {
           this.setState({ ...this.state, mode: 'new' })
        }  

        const onResetKey = () => {
            initLicenseData()
            fairCopy.services.ipcSend('exitApp')
        }

        const projectCards = []
        for( const project of projects ) {
            projectCards.push(this.renderProjectCard(project))
        }

        return (
            <div className="content select-project">
                <div className="left-side">
                    <Typography variant="h6" component="h2">Select a Project</Typography>
                    <Button className="left-action" onClick={onClickNew} variant='contained'>New Project...</Button>
                    <Button className="left-action" onClick={onClickOpen} variant='contained'>Open Project...</Button>
                    { allowKeyReset && <Button className="left-action" onClick={onResetKey} variant='contained'>Reset License Key</Button> }
                </div>
                <div className="right-side">
                    <Typography variant="h6" component="h2">Recent Projects</Typography>
                    { projectCards }
                </div>
            </div>
        )
    }

    renderManageLicense() {
        const onManageLicense = () => {
            this.setState({ ...this.state, mode: 'manageLicense' })
        } 
        return (
            <div className="content">
                <Button className="license-button" size="small" onClick={onManageLicense} variant='contained'>Manage License</Button>
            </div>
        )
    }

    renderLicenseLine() {
        // determined based on activation state
        // this.renderManageLicenseButton()
        return this.renderFreeTrialLine()
    }

    renderManageLicenseButton() {
        const onManageLicense = () => {
           this.setState({ ...this.state, mode: 'manageLicense' })
        }
        return (
            <div className="license-line">
                <Button className="license-button" size="small" onClick={onManageLicense} variant='contained'>Manage License</Button>
            </div>
        )
    }

    renderLicensePanel() {

        const onActivateSuccess = () => {
            // TODO activation success 
            this.setState({ ...this.state, mode: 'select' })
        }

        const onActivateLicense = ( licenseKey, onError ) => {
            const { licenseData } = this.state
            const { machineID } = licenseData
            const { appConfig } = this.props
            activateLicense( appConfig.devMode, licenseKey, machineID, onActivateSuccess, onError)
        }

        const onCancel = () => {
            this.setState({ ...this.state, mode: 'select' })
        }
        
        return (
            <LicensePanel
                mode='buy'
                onActivate={onActivateLicense}
                onCancel={onCancel}
            ></LicensePanel>
        )
    }

    renderFreeTrialLine() {
        const onBuyNow = () => {
            this.setState({ ...this.state, mode: 'licensePanel' })
        }

        const daysLeft = licenseDaysLeft()
        const s = daysLeft !== 1 ? "s" : ""

        return (
            <div className="license-line">
                <Typography className="license-blurb">You have {daysLeft} day{s} left in your free trial.</Typography>
                <Button className="license-button" size="small" onClick={onBuyNow} variant='contained'>Buy Now</Button>
            </div>
        )
    }

    render() {
        const { appConfig } = this.props
        const { mode } = this.state

        const appVersion = appConfig ? `v${appConfig.version}` : ''
        const allowKeyReset = appConfig ? appConfig.devMode : false
        const devModeTag = appConfig && appConfig.devMode ? 'DEV' : ''

        let content 
        switch(mode) {
            case 'select':
                content = this.renderSelectProject(allowKeyReset)
                break
            case 'new':
                content = this.renderNewProject()
                break
            case 'manageLicense':
                content = this.renderManageLicense()
                break
            case 'licensePanel':
                content = this.renderLicensePanel()
                break
            default:
                console.log("Unrecognized view mode.")
                break
        }

        return (
            <main id="ProjectWindow" >
                <header className='header'>
                    <Typography variant="h5" component="h1"><i className='fas fa-feather-alt fa-lg'></i> FairCopy {appVersion} {devModeTag}</Typography>
                    <Typography>A word processor for the humanities scholar.</Typography>
                </header>
                { content }
                { mode === 'select' && this.renderLicenseLine() }
            </main>
        )
    }

}
