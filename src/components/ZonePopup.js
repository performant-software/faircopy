import React, { Component } from 'react'
import { Popper, Button, Paper, Card, CardContent, CardActions, TextField } from '@material-ui/core'
import IDField from './attribute-fields/IDField'

export default class ZonePopup extends Component {

    
    renderEditor() {
        const { teiDocument, zone, onChange, onSave, onCancel } = this.props
        const { id, note } = zone
        
        // TODO add delete button when editing

     
        return (
            <Card variant="outlined" className="zoneEditor"  >
                <div className="zone-id">
                    <IDField
                        teiDocument={teiDocument}
                        value={id}
                        onChangeCallback={onChange}
                    ></IDField>
                </div>
                <CardContent>
                    <TextField
                        name="note"
                        onChange={onChange}
                        multiline={true}
                        value={note}
                    ></TextField>
                </CardContent>
                <CardActions>
                    <Button onClick={onSave}>Save</Button>
                    <Button onClick={onCancel}>Cancel</Button>
                </CardActions>
            </Card>
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
