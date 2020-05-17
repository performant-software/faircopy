import React, { Component } from 'react';
import { Typography } from '@material-ui/core'
import TableOfContents from './TableOfContents'
import ProjectNavigator from './ProjectNavigator'

export default class ProjectSidebar extends Component {

    render() {
        const { fairCopyProject, selectedResource, openResources, onSelectResource } = this.props

        return (
            <div id="ProjectSidebar">
                <Typography>OPEN RESOURCES</Typography>
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