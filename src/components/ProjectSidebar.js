import React, { Component } from 'react';
import { Button, Typography } from '@material-ui/core'
import TableOfContents from './TableOfContents'
import ProjectNavigator from './ProjectNavigator'

export default class ProjectSidebar extends Component {

    render() {
        const { fairCopyProject, selectedResource, openResources, onSelectResource } = this.props

        return (
            <div id="ProjectSidebar">
                <div className="title-bar">
                    <Typography  variant="h6" className="project-title">{fairCopyProject.projectName}</Typography>
                    <Button className="edit-button">
                        <i className="far fa-edit fa-2x"></i>
                    </Button>
                </div>
                <ProjectNavigator
                    fairCopyProject={fairCopyProject}
                    openResources={openResources}
                    selectedResource={selectedResource}
                    onSelectResource={onSelectResource}
                ></ProjectNavigator>
                <Typography>TABLE OF CONTENTS</Typography>
                { selectedResource && 
                    <TableOfContents
                        teiDocument={openResources[selectedResource]}        
                    ></TableOfContents>
                }       
            </div>
        )
    }
}