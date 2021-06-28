import React, { Component } from 'react'
import { Popper, Button, Paper, Card, CardContent, CardActions, TextField } from '@material-ui/core'
import IDField from '../tei-editor/attribute-fields/IDField'

export default class ZonePopup extends Component {

    
    renderEditor() {
        const { facsDocument, facsID, zone, onChange, onSave, onCancel, onErase } = this.props
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
                        idPrefix={facsID}
                        hasID={facsDocument.hasID}
                        value={id}
                        onChangeCallback={onChangeID}
                    ></IDField>
                </div>
                <CardContent>
                    <TextField
                        name="note"
                        onChange={onChangeText}
                        multiline
                        rowsMax={4}
                        placeholder="Add a note."
                        variant="outlined"
                        value={note}
                    ></TextField>
                </CardContent>
                <CardActions >
                    <Button size="small" onClick={onErase}><i className={`fas fa-eraser fa-2x`}></i></Button>  
                    <div className="zoneActions">
                        <Button className="zone-action" size="small" variant="contained" color="primary" onClick={onSave}>Save</Button>
                        <Button className="zone-action" size="small" variant="outlined" onClick={onCancel}>Cancel</Button>
                    </div>
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
