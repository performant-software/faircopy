import React, { Component } from 'react'
import { Button, Typography, Tabs, Tab } from '@material-ui/core'

import GeneralSettings from './GeneralSettings'
import SchemaEditor from './SchemaEditor'
import EditorSettings from './EditorSettings'
import PublishingSettings from './PublishingSettings'
import { canConfigAdmin, isAdmin } from '../../model/permissions'
import { getConfigStatus } from '../../model/faircopy-config'
import { inlineRingSpinner } from '../common/ring-spinner'
import { logout } from '../../model/cloud-api/auth'

const fairCopy = window.fairCopy

export default class ProjectSettingsWindow extends Component {

    constructor(props) {
        super()

        // make an editable copy of the config
        const { fairCopyProject } = props
        const fairCopyConfig = JSON.parse(JSON.stringify(fairCopyProject.fairCopyConfig))
        const projectInfo = fairCopyProject.getProjectInfo()

        this.state = {
            fairCopyConfig,
            projectInfo,
            selectedPage: 'general'
        }
    }

    componentDidMount() {
        fairCopy.ipcRegisterCallback("updateProjectInfo", this.onUpdateProjectInfo.bind(this));
    }
    componentWillUnmount() {
        fairCopy.ipcRemoveListener("updateProjectInfo", this.onUpdateProjectInfo.bind(this));
    }

    onUpdateProjectInfo(e, projectInfo) {
        this.setState((prevState) => ({
            ...prevState,
            projectInfo,
        }))
    }

    onSaveConfig(closeConfig) {
        const { onSave } = this.props
        const { fairCopyConfig, projectInfo } = this.state
        onSave(fairCopyConfig, projectInfo, closeConfig)
    }

    renderSidebar() {
        const { selectedPage } = this.state

        const onChangeMenu = (e,nextPage) => {
            this.setState({...this.state, selectedPage: nextPage })
        }

        return (
            <div className="sidebar">
                <Tabs orientation="vertical" value={selectedPage} onChange={onChangeMenu}>
                    <Tab value="general" label="Metadata" />
                    <Tab value="elements" label="Schema"/>
                    <Tab value="editor" label="Editor"/>
                    <Tab value="previewCSS" label="Publishing"/>
                </Tabs>
            </div>
        )
    }

    renderContentArea() {
        const { checkingOut } = this.props
        const { teiSchema, remote, configLastAction, userID, isLoggedIn, permissions } = this.props.fairCopyProject
        const { fairCopyConfig, projectInfo, selectedPage } = this.state
        const lockStatus = getConfigStatus( configLastAction, userID )
        const canEdit = !remote || (!checkingOut && lockStatus === 'checked_out')

        const onUpdate = (nextConfig) => {
            this.setState({...this.state,fairCopyConfig: nextConfig})
        }

        const onSaveCss = (nextConfig) => {
            // set the updated config on the state, then persist it without closing the config
            this.setState({...this.state, fairCopyConfig: nextConfig}, () => this.onSaveConfig(false))
        }

        const onUpdateProject = (nextProjectInfo) => {
            this.setState({...this.state,projectInfo: nextProjectInfo})            
        }

        const onReset = () => {
            const { baseConfigJSON } = this.props.fairCopyProject
            const nextConfig = JSON.parse(baseConfigJSON)
            this.setState({...this.state,fairCopyConfig: nextConfig})     
        }
        
        const onLogout = () => {
            const { fairCopyProject } = this.props
            const { userID, serverURL } = fairCopyProject
            logout(userID, serverURL)
            this.setState({...this.state})
            fairCopy.ipcSend('requestResourceView')
        }

        const onPublishCss = () => {
            fairCopy.ipcSend('publishCss')
        }

        return (
            <div className="content-area">
                { selectedPage === 'general' && <GeneralSettings
                    projectInfo={projectInfo}
                    fairCopyConfig={fairCopyConfig}
                    onUpdateProject={onUpdateProject}
                    onUpdateConfig={onUpdate}
                    isLoggedIn={isLoggedIn}
                    onLogout={onLogout}
                    onReset={onReset}
                ></GeneralSettings> }
                { selectedPage === 'elements' && <SchemaEditor
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    readOnly={!canEdit}
                    onUpdateConfig={onUpdate}
                ></SchemaEditor> }
                { selectedPage === 'editor' && <EditorSettings
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    readOnly={!canEdit}
                    onUpdateConfig={onUpdate}
                ></EditorSettings> }
                { selectedPage === 'previewCSS' && <PublishingSettings
                    canPublish={isAdmin(permissions)}
                    checkedOut={lockStatus === 'checked_out'}
                    hasDraftCss={projectInfo?.hasDraftCss}
                    hasPublishedCss={projectInfo?.hasPublishedCss}
                    fairCopyConfig={fairCopyConfig}
                    readOnly={!canEdit}
                    publishReadOnly={remote && checkingOut}
                    onUpdateConfig={onSaveCss}
                    onPublishCss={onPublishCss}
                ></PublishingSettings>}
            </div>
        )
    }
    
    renderActions() {
        const { fairCopyProject, onClose, onCheckOut, onCheckIn, checkingOut, checkOutError } = this.props
        const { permissions, configLastAction, userID, remote } = fairCopyProject
        const { selectedPage } = this.state
        const canConfig = canConfigAdmin(permissions)
        const lockStatus = getConfigStatus( configLastAction, userID )
        const loggedIn = fairCopyProject.isLoggedIn()
        
        const onLock = () => {
            if( lockStatus === 'checked_in' ) {
                onCheckOut()
            } else if( lockStatus === 'checked_out') {
                const { fairCopyConfig } = this.state
                onCheckIn(fairCopyConfig)
            }
        }

        const lockIcon = getLockIcon(lockStatus)
        const lockLabel = getLockLabel(lockStatus)
        const lockDisabled = lockStatus === 'checked_out_by_another' 
        const spinner = checkingOut ? inlineRingSpinner('dark') : null

        // only show save/cancel on checked out or local-only config;
        // hide it in the CSS window because the inner dialog's save function saves the whole config
        const showSaveCancel = (!remote || (canConfig && lockStatus === 'checked_out')) && selectedPage !== 'previewCSS'

        return (
            <div>
                { remote && loggedIn && canConfig && <div className="window-actions-left">
                    <Button disabled={lockDisabled} className="action-button" variant="contained" onClick={onLock} >
                        <i className={`${lockIcon} fa-sm lock-icon`}></i> {lockLabel} {spinner}
                    </Button>
                    { checkOutError && <Typography className="error-message" >Error: {checkOutError}</Typography>}
                </div> }
                { showSaveCancel ? 
                    <div className="window-actions-right">
                        <Button className="action-button" variant="contained" onClick={() => this.onSaveConfig(true)} >Save</Button>
                        <Button className="action-button" variant="contained" onClick={onClose}>Cancel</Button>                        
                    </div>            
                :
                    <div className="window-actions-right">
                        <Button className="action-button" variant="contained" onClick={onClose}>Close</Button>                        
                    </div>                
                }
            </div>    
        )
    }

    render() {
        return (
            <div id="ProjectSettingsWindow">
                <div className="title" >
                    <Typography component="h1" variant="h6"><i className="fas fa-cog"></i> Project Settings</Typography>
                </div>
                <div>
                    { this.renderSidebar() }
                    { this.renderContentArea() }
                </div>
                <div className="footer">
                    { this.renderActions() }
                </div>
            </div>
        )
    }
}

function getLockIcon(lockStatus) {
    switch (lockStatus) {
        case 'checked_in':
            return 'fa fa-cloud-arrow-down'
        case 'checked_out':
            return 'fa fa-cloud-arrow-up'
        case 'checked_out_by_another':
            return 'fa fa-lock'
        default:
            return ''
    }
}

function getLockLabel(lockStatus) {
    switch (lockStatus) {
        case 'checked_in':
            return 'Check Out'
        case 'checked_out':
            return 'Check In'
        case 'checked_out_by_another':
            return 'Checked Out'
        default:
            return ''
    }
}