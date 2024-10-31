import React, { Component } from 'react';
import { IconButton, Typography, Tooltip } from '@material-ui/core'
import TableOfContents from './TableOfContents'
import ProjectNavigator from './ProjectNavigator'
import ValidationReport from './ValidationReport'

export default class ProjectSidebar extends Component {

    renderButton(title,icon,onClick,enabled=true,onRef=null,active=false) {
        const refProps = onRef ? { ref: onRef } : {}
        const colorProps = active ? { color: 'primary' } : {}
        const iconButton = (
            <IconButton
                disabled={!enabled}
                onClick={onClick}
                className="action-button"
                {...refProps}
                {...colorProps}
            >
                <i className={`${icon} fa-sm`}></i>
            </IconButton> 
        )
             
        return enabled ? <Tooltip title={title}>{iconButton}</Tooltip> : iconButton
    }

    render() {
        const { fairCopyProject, selectedResource, openResources, onSelectResource, onEditProjectInfo, onCloseResource, panelWidth } = this.props
        return (
            <nav id="ProjectSidebar">
                <div className="title-bar">
                    <Typography  variant="h6" component="h1" className="project-title">{fairCopyProject.projectName}</Typography>
                    { this.renderButton('Edit Project Settings', 'fas fa-cog', onEditProjectInfo )}
                </div>
                <ProjectNavigator
                    openResources={openResources}
                    selectedResource={selectedResource}
                    fairCopyProject={fairCopyProject}
                    panelWidth={panelWidth}
                    onSelectResource={onSelectResource}
                    onCloseResource={onCloseResource}
                ></ProjectNavigator>
                <TableOfContents
                    teiDocument={openResources[selectedResource]}      
                    fairCopyProject={fairCopyProject}
                    panelWidth={panelWidth}  
                ></TableOfContents>
                <ValidationReport
                    teiDocument={openResources[selectedResource]}      
                    fairCopyProject={fairCopyProject}
                    panelWidth={panelWidth}  
                ></ValidationReport>
            </nav>
        )
    }
}