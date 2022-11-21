import React, { Component } from 'react'
import { Button, Typography, Tabs, Tab } from '@material-ui/core'

import GeneralSettings from './GeneralSettings'
import SchemaEditor from './SchemaEditor'
import { canConfigAdmin } from '../../model/permissions'

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
        const { teiSchema, permissions } = this.props.fairCopyProject
        const { fairCopyConfig, projectInfo, selectedPage } = this.state
        const readOnly = !canConfigAdmin(permissions)

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
                    readOnly={readOnly}
                    onUpdateConfig={onUpdate}
                ></SchemaEditor> }
                { selectedPage === 'vocabs' && <div>
                    <h1>VOCAB EDITOR</h1>
                </div> }
            </div>
        )
    }
    
    renderActions() {
        const { fairCopyProject, onClose, onSave } = this.props
        const { permissions } = fairCopyProject
        const canConfig = canConfigAdmin(permissions)

        const onSaveConfig = () => {
            const { fairCopyConfig, projectInfo } = this.state
            onSave(fairCopyConfig, projectInfo)
        }

        if( canConfig ) {
            return (
                <div className="window-actions">
                    <Button className="action-button" variant="contained" onClick={onSaveConfig} >Save</Button>
                    <Button className="action-button" variant="contained" onClick={onClose}>Cancel</Button>                        
                </div>
            )
        } else {
            return (
                <div className="window-actions">
                    <Button className="action-button" variant="contained" onClick={onClose}>Close</Button>                        
                </div>
            )
        }
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
