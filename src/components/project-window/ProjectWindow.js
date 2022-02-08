import React, { Component } from 'react'
import { Button, Typography, Card, CardContent, TextField, CardActionArea} from '@material-ui/core'

import LicensePanel from '../license-window/LicensePanel'
import { resetLicenseData, licenseDaysLeft, activateLicense, getLicenseType, setExpiration, oneDayMs, updateLicenseStatus, simulateEAP } from '../../model/license-key'

const fairCopy = window.fairCopy

export default class ProjectWindow extends Component {

    constructor() {
        super()
        this.initialState = { 
            mode: 'select', 
            projectName: '',
            description: '',
            filePath: '',
            errorMessage: null 
        }
        this.state = this.initialState
    }

    onPathSelected = (event, filePath) => this.onPathUpdated(filePath)

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('pathSelected', this.onPathSelected )
    }

    componentWillUnmount() {
        const {services} = fairCopy
        services.ipcRemoveListener('pathSelected', this.onPathSelected )
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
            resetLicenseData()
            fairCopy.services.ipcSend('exitApp')
        }

        const onEAPKey = () => {
            simulateEAP()
            fairCopy.services.ipcSend('exitApp')
        }

        const onExpired = () => {
            setExpiration(-oneDayMs)
            fairCopy.services.ipcSend('exitApp')
        }

        const on14Days = () => {
            setExpiration(oneDayMs*14)
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
                    { allowKeyReset && <Button className="left-action" onClick={onExpired} variant='contained'>Simulate Expired</Button> }
                    { allowKeyReset && <Button className="left-action" onClick={on14Days} variant='contained'>Simulate 14 Days</Button> }
                    { allowKeyReset && <Button className="left-action" onClick={onEAPKey} variant='contained'>Simulate EAP</Button> }
                </div>
                <div className="right-side">
                    <Typography variant="h6" component="h2">Recent Projects</Typography>
                    { projectCards }
                </div>
            </div>
        )
    }

    renderManageLicense() {
        const onClose = () => {
            this.setState({ ...this.state, mode: 'select' })
        } 

        const currentLicenseData = JSON.parse(localStorage.getItem('licenseData'))
        const { licenseKey, subscription, expiresAt, secureID } = currentLicenseData
        const renewalDate = new Date(expiresAt).toLocaleDateString()

        const onRenew = () => {
            fairCopy.services.ipcSend('openRenewalWebpage', secureID)
        }

        const devMode = true

        const onUpdateStatus = () => {
            updateLicenseStatus(devMode,licenseKey,
                () => {
                    this.setState({...this.state, errorMessage: null })
                },
                (errorMessage) => {
                    this.setState({...this.state, errorMessage })
                }
            )
        }

        let buttonLabel, renewalBlurb
        if( subscription ) {
            buttonLabel = "Manage Subscription"
            renewalBlurb = `Your license will automatically renew on ${renewalDate}`
    
        } else {
            const daysLeft = licenseDaysLeft()
            buttonLabel = "Renew License"
            if( daysLeft >= 0 ) {
                renewalBlurb = `Renew by ${renewalDate} to get 50% off next year.`
            } else {
                renewalBlurb = "Renew your license now to get access to the latest features."
            }
        }

        const { errorMessage } = this.state

        return (
            <div className="content">
                <Typography className="license-info" >License Key: {licenseKey}</Typography>
                <Typography className="license-info" >{renewalBlurb}</Typography>
                <Typography className="license-info" >Please click "Update Status" after you renew your license on the website.</Typography>
                { errorMessage && <Typography className="license-error" >{errorMessage}</Typography> }
                <Button className="license-button" size="small" onClick={onRenew} variant='contained'>{buttonLabel}<i className="fas fa-external-link-alt link"></i></Button>
                <Button className="license-button" size="small" onClick={onUpdateStatus} variant='contained'>Update Status</Button>
                <Button className="license-button" size="small" onClick={onClose} variant='contained'>Done</Button>
            </div>
        )
    }

    renderLicenseLine() {
        const licenseType = getLicenseType()
        console.log(`license type: ${licenseType}`)
        if( licenseType === 'paid' ) {
            return this.renderManageLicenseLine()
        } else {
            return this.renderFreeTrialLine()
        }
    }

    renderManageLicenseLine() {
        const onManageLicense = () => {
           this.setState({ ...this.state, mode: 'manageLicense' })
        }

        const daysLeft = licenseDaysLeft()
        const s = daysLeft !== 1 ? "s" : ""
        
        return (
            <div className="license-line">
                { daysLeft <= 14 && daysLeft >= 0 && <Typography className="license-blurb">Renew now! You have {daysLeft} day{s} left to get 50% off. </Typography> }
                <Button className="license-button" size="small" onClick={onManageLicense} variant='contained'>Manage License</Button>
            </div>
        )
    }

    renderLicensePanel() {
        const { appConfig } = this.props

        const onActivateSuccess = () => {
            // TODO activation success 
            this.setState({ ...this.state, mode: 'select' })
        }

        const onActivateLicense = ( licenseKey, onError ) => {
            activateLicense( appConfig.devMode, licenseKey, onActivateSuccess, onError)
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
