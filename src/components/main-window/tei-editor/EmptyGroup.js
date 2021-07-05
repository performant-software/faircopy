import React, { Component } from 'react'
import { Button, Typography } from '@material-ui/core'

export default class EmptyGroup extends Component {
    render() {  
        const { onProjectSettings } = this.props

        return (
            <div id="EmptyGroup">
                <Typography>This menu is empty. You can add elements to it in Project Settings<i className="fa fa-arrow-right fa-sm"></i>Elements.</Typography>
                <Button onClick={onProjectSettings}><i className="fas fa-cog fa-sm"></i> Project Settings</Button>
            </div>
        )
    }
}