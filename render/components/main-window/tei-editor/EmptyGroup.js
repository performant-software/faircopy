import React, { Component } from 'react'
import { Popper, Paper } from '@material-ui/core'
import { Button, Typography } from '@material-ui/core'

export default class EmptyGroup extends Component {
    render() {  
        const { onProjectSettings, anchorEl} = this.props

        if( !onProjectSettings ) return null

        // TODO handle left arrow .. add tabIndex and onClose
        // TODO neeed a mode for the structure palette

        return (
            <Popper id="EmptyGroup" placement='right-start' open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                <Paper className="empty-group-body" elevation={6}>
                    <Typography>This menu has no elements. You can add elements in Project Settings.</Typography>
                    <Button className="project-settings-button" onClick={onProjectSettings}>
                        <i className="fas fa-cog fa-sm"></i> Project Settings
                    </Button>
                </Paper>
            </Popper>
        )
    }
}