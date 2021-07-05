import React, { Component } from 'react'
import { Button, Typography } from '@material-ui/core'

export default class EmptyGroup extends Component {
    render() {  
        const { onProjectSettings } = this.props

        return (
            <div id="EmptyGroup">
                <Typography>This menu has no elements. You can add elements in Project Settings.</Typography>
                <Button className="project-settings-button" onClick={onProjectSettings}><i className="fas fa-cog fa-sm"></i> Project Settings</Button>
            </div>
        )
    }
}