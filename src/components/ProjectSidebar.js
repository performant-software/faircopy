import React, { Component } from 'react';
import { Button, Typography } from '@material-ui/core'
import TableOfContents from './TableOfContents'
import ProjectNavigator from './ProjectNavigator'

export default class ProjectSidebar extends Component {

    render() {
        const { fairCopyProject, selectedResource, openResources, onSelectResource, onEditProjectInfo, onCloseResource, panelWidth } = this.props
        return (
            <div id="ProjectSidebar">
                <div className="title-bar">
                    <Typography  variant="h6" className="project-title">{fairCopyProject.projectName}</Typography>
                    <Button className="edit-button"
                        onClick={onEditProjectInfo}
                        disableRipple={true}
                        disableFocusRipple={true}
                    >
                        <i className="far fa-edit fa-2x"></i>
                    </Button>
                </div>
                <ProjectNavigator
                    openResources={openResources}
                    selectedResource={selectedResource}
                    fairCopyProject={fairCopyProject}
                    panelWidth={panelWidth}
                    onSelectResource={onSelectResource}
                    onCloseResource={onCloseResource}
                ></ProjectNavigator>
                { false && 
                    <TableOfContents
                        teiDocument={openResources[selectedResource]}        
                    ></TableOfContents>
                }       
            </div>
        )
    }
}