import React, { Component } from 'react'
import { Button, Typography, Tabs, Tab } from '@material-ui/core'

import GeneralSettings from './GeneralSettings'
import SchemaEditor from './SchemaEditor'
import { canConfigAdmin } from '../../model/permissions'
import { getConfigStatus } from '../../model/faircopy-config'
import { inlineRingSpinner } from '../common/ring-spinner'

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

    renderSidebar() {
        const { selectedPage } = this.state

        const onChangeMenu = (e,nextPage) => {
            this.setState({...this.state, selectedPage: nextPage })
        }

        return (
            <div className="sidebar">
                <Tabs orientation="vertical" value={selectedPage} onChange={onChangeMenu}>
                    <Tab value="general" label="General" />
                    <Tab value="elements" label="Schema"/>
                    {/* <Tab disabled value="vocabs" label="Vocabs"/> */}
                </Tabs>
            </div>
        )
    }

    renderContentArea() {
        const { checkingOut } = this.props
        const { teiSchema, remote, configLastAction, userID } = this.props.fairCopyProject
        const { fairCopyConfig, projectInfo, selectedPage } = this.state
        const lockStatus = getConfigStatus( configLastAction, userID )
        const canEdit = !remote || (!checkingOut && lockStatus === 'unlocked')

        const onUpdate = (nextConfig) => {
            this.setState({...this.state,fairCopyConfig: nextConfig})
        }

        const onUpdateProject = (nextProjectInfo) => {
            this.setState({...this.state,projectInfo: nextProjectInfo})            
        }

        const onReset = () => {
            const { baseConfigJSON } = this.props.fairCopyProject
            const nextConfig = JSON.parse(baseConfigJSON)
            this.setState({...this.state,fairCopyConfig: nextConfig})     
        }

        return (
            <div className="content-area">
                { selectedPage === 'general' && <GeneralSettings
                    projectInfo={projectInfo}
                    fairCopyConfig={fairCopyConfig}
                    onUpdateProject={onUpdateProject}
                    onUpdateConfig={onUpdate}
                    onReset={onReset}
                ></GeneralSettings> }
                { selectedPage === 'elements' && <SchemaEditor
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    readOnly={!canEdit}
                    onUpdateConfig={onUpdate}
                ></SchemaEditor> }
                { selectedPage === 'vocabs' && <div>
                    <h1>VOCAB EDITOR</h1>
                </div> }
            </div>
        )
    }
    
    renderActions() {
        const { fairCopyProject, onClose, onSave, onCheckOut, onCheckIn, checkingOut, checkOutError } = this.props
        const { permissions, configLastAction, userID, remote } = fairCopyProject
        const canConfig = canConfigAdmin(permissions)
        const lockStatus = getConfigStatus( configLastAction, userID )

        const onSaveConfig = () => {
            const { fairCopyConfig, projectInfo } = this.state
            onSave(fairCopyConfig, projectInfo, false)
        }
        
        const onLock = () => {
            if( lockStatus === 'locked' ) {
                onCheckOut()
            } else if( lockStatus === 'unlocked') {
                // special flag for the initial commit of the config
                const { fairCopyConfig } = this.state
                onCheckIn(fairCopyConfig)
            }
        }

        const lockIcon = getLockIcon(lockStatus)
        const lockLabel = getLockLabel(lockStatus)
        const lockDisabled = lockStatus === 'unlocked_by_another' 
        const spinner = checkingOut ? inlineRingSpinner('dark') : null

        return (
            <div>
                { remote && canConfig && <div className="window-actions-left">
                    <Button disabled={lockDisabled} className="action-button" variant="contained" onClick={onLock} ><i className={`${lockIcon} fa-sm lock-icon`}></i> {lockLabel} {spinner}</Button>
                    { checkOutError && <Typography className="error-message" >Error: {checkOutError}</Typography>}
                </div> }
                { !remote || (canConfig && lockStatus === 'unlocked') ? 
                    <div className="window-actions-right">
                        <Button className="action-button" variant="contained" onClick={onSaveConfig} >Save</Button>
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
    return lockStatus === 'locked' ? 'fas fa-lock' : lockStatus === 'unlocked' ? 'fas fa-unlock' : 'far fa-lock'
}

function getLockLabel(lockStatus) {
    return lockStatus === 'locked' ? 'Unlock' : lockStatus === 'unlocked' ? 'Lock' : 'Locked'
}