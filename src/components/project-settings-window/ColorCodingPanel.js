import React, { Component } from 'react'
import { Typography } from '@material-ui/core'
import { Tooltip, IconButton, Button } from '@material-ui/core'

export default class ColorCodingPanel extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedAction: null,
            selectedKey: null,
            keybindingDialog: false
        }
    }

    render() {
        return (
            <div id="ColorCodingPanel">
                <Typography variant="h5">Color Coding</Typography>
                <Typography className="explanation">Assign color codes.</Typography>
            </div>
        )
    }
}