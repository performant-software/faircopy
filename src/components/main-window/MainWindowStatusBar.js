import React, { Component } from 'react'
import SearchBar from './SearchBar'

import { Button, Tooltip } from '@material-ui/core';

const fairCopy = window.fairCopy

export default class MainWindowStatusBar extends Component {

    constructor(props) {
        super(props)

        const licenseDataJSON = localStorage.getItem('licenseData')
        const licenseData = JSON.parse(licenseDataJSON)

        this.state = {
            softwareUpdateStatus: 'OK',
            progress: 0,
            licenseData
        }
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('updateAvailable', (event) => {
            this.setState({ ...this.state, softwareUpdateStatus: 'updateAvailable' })
        })

        fairCopy.services.ipcRegisterCallback('updateDownloading', (event,progress) => {
            this.setState({ ...this.state, progress })
        })

        fairCopy.services.ipcRegisterCallback('updateDownloaded', (event) => {
            this.setState({ ...this.state, softwareUpdateStatus: 'quitAndInstall' })
        })

        fairCopy.services.ipcRegisterCallback('errorUpdating', (event, error) => {
            this.setState({ ...this.state, softwareUpdateStatus: 'error' })
        })

        const { licenseData } = this.state
        fairCopy.services.ipcSend( 'checkForUpdates', licenseData )
    }

    onStartUpdate = () => {
        fairCopy.services.ipcSend( 'downloadUpdate' )
        this.setState({ ...this.state, softwareUpdateStatus: 'downloading', progress: 0 })
    }

    render() {
        const { appConfig, onQuitAndInstall, onFeedback, onDisplayNotes, fairCopyProject, currentResource, onSearchResults, onResourceAction } = this.props
        const { softwareUpdateStatus, progress } = this.state

        const appVersion = appConfig ? `v${appConfig.version}` : ''
        const devModeTag = appConfig && appConfig.devMode ? 'DEV' : ''

        return (
            <div id="MainWindowStatusBar" className="bar">
                    <SearchBar
                        fairCopyProject={fairCopyProject}
                        currentResource={currentResource}
                        onResourceAction={onResourceAction}
                        onSearchResults={onSearchResults}
                    ></SearchBar>
                    { softwareUpdateStatus === 'OK' && 
                        <Button onClick={onDisplayNotes} className="version-button" size="small" variant="outlined" color="inherit">
                                { appVersion } {devModeTag }                       
                        </Button> 
                    }
                    { softwareUpdateStatus === 'updateAvailable' && 
                        <Button onClick={this.onStartUpdate } className="version-button" size="small" variant="outlined" color="inherit">
                                <i className="fas fa-bell fa-lg"></i> Update Available                       
                        </Button> 
                    }
                    { softwareUpdateStatus === 'downloading' && 
                        <Button className="version-button" size="small" variant="outlined" color="inherit">
                                Downloading... {progress}%            
                        </Button> 
                    }
                    { softwareUpdateStatus === 'quitAndInstall' && 
                        <Button onClick={onQuitAndInstall}className="version-button" size="small" variant="outlined" color="inherit">
                                <i className="fas fa-sync fa-lg"></i> Restart to Update
                        </Button> 
                    }
                    { softwareUpdateStatus === 'error' && 
                        <Button className="version-button" size="small" variant="outlined" color="inherit">
                                <i className="fas fa-times fa-lg"></i> Error updating                 
                        </Button> 
                    }
                        <Tooltip title="Send developer feedback">
                            <Button className="feedback-button" size="small" color="inherit" onClick={onFeedback}><i className="fas fa-bullhorn fa-lg"></i></Button>
                        </Tooltip>
            </div>
        )
    }
}