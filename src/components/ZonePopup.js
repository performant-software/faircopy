import React, { Component } from 'react'
import { Popper, Button, Paper, Card, CardContent, CardActions, TextField } from '@material-ui/core'
import IDField from './attribute-fields/IDField'

export default class ZonePopup extends Component {

    
    renderEditor() {
        const { facsDocument, zone, onChange, onSave, onCancel } = this.props
        const { id, note } = zone
        
        // TODO add delete button when editing
        const onChangeText = (e) => {
            const {name, value} = e.target
            onChange(name,value,false)
        }
        const onChangeID = (value,error) => onChange('id',value,error)

        return (
            <Card variant="outlined" className="zoneEditor"  >
                <div className="zone-id">
                    <IDField
                        teiDocument={facsDocument}
                        value={id}
                        onChangeCallback={onChangeID}
                    ></IDField>
                </div>
                <CardContent>
                    <TextField
                        name="note"
                        onChange={onChangeText}
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
