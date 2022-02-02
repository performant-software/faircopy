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

    onUpdateAvailable = (event) => {
        this.setState({ ...this.state, softwareUpdateStatus: 'updateAvailable' })
    }

    onUpdateDownloading = (event,progress) => {
        this.setState({ ...this.state, progress })
    }

    onUpdateDownloaded = (event) => {
        this.setState({ ...this.state, softwareUpdateStatus: 'quitAndInstall' })
    }

    onErrorUpdating = (event, error) => {
        this.setState({ ...this.state, softwareUpdateStatus: 'error' })
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('updateAvailable', this.onUpdateAvailable)
        fairCopy.services.ipcRegisterCallback('updateDownloading', this.onUpdateDownloading)
        fairCopy.services.ipcRegisterCallback('updateDownloaded', this.onUpdateDownloaded)
        fairCopy.services.ipcRegisterCallback('errorUpdating', this.onErrorUpdating)

        const { licenseData } = this.state
        fairCopy.services.ipcSend( 'checkForUpdates', licenseData )
    }

    componentWillUnmount() {
        fairCopy.services.ipcRemoveListener('updateAvailable', this.onUpdateAvailable)
        fairCopy.services.ipcRemoveListener('updateDownloading', this.onUpdateDownloading)
        fairCopy.services.ipcRemoveListener('updateDownloaded', this.onUpdateDownloaded)
        fairCopy.services.ipcRemoveListener('errorUpdating', this.onErrorUpdating)
    }

    onStartUpdate = () => {
        fairCopy.services.ipcSend( 'downloadUpdate' )
        this.setState({ ...this.state, softwareUpdateStatus: 'downloading', progress: 0 })
    }

    render() {
        const { appConfig, onQuitAndInstall, onFeedback, onDisplayNotes, fairCopyProject, onAlertMessage, currentResource, onSearchResults, searchSelectionIndex, onUpdateSearchSelection, onSearchFilter, onResourceAction, searchEnabled, searchFilterOptions } = this.props
        const { softwareUpdateStatus, progress } = this.state

        const appVersion = appConfig ? `v${appConfig.version}` : ''
        const devModeTag = appConfig && appConfig.devMode ? 'DEV' : ''

        return (
            <footer id="MainWindowStatusBar" className="bar">
                    <SearchBar
                        fairCopyProject={fairCopyProject}
                        searchEnabled={searchEnabled}
                        searchSelectionIndex={searchSelectionIndex}
                        onUpdateSearchSelection={onUpdateSearchSelection}
                        onAlertMessage={onAlertMessage}
                        currentResource={currentResource}
                        onResourceAction={onResourceAction}
                        onSearchResults={onSearchResults}
                        onSearchFilter={onSearchFilter}
                        searchFilterOptions={searchFilterOptions}
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
            </footer>
        )
    }
}