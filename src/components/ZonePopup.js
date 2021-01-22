import React, { Component } from 'react'
import { Popper, Paper } from '@material-ui/core'

export default class ZonePopup extends Component {

    constructor() {
        super()
        this.state = {
        }
    }

    renderEditor() {
        const { zone } = this.props

        return (
            <div >
               <h1>TEST {zone.id} </h1>
            </div>
        )        
    }

    render() {
        const { anchorEl } = this.props

        if( !anchorEl ) return null

        const placement = 'bottom-start'
        const elevation = 6

        return (
            <div id="ZonePopup">
                 <Popper className="note-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                    <Paper elevation={elevation}>
                        { this.renderEditor() }            
                    </Paper>
                </Popper>
            </div>
        )
    }
}
