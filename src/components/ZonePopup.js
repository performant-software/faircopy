import React, { Component } from 'react'
import { Popper, Button, Paper } from '@material-ui/core'

export default class ZonePopup extends Component {

    constructor() {
        super()
        this.state = {
        }
    }

    renderEditor() {
        const { zone, onSave, onCancel } = this.props

        return (
            <div >
               <h1>TEST {zone.id} </h1>
               <Button onClick={onSave}>Save</Button>
               <Button onClick={onCancel}>Cancel</Button>
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
