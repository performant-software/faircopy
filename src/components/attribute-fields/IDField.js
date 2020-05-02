import React, { Component } from 'react';
import { TextField, Typography, IconButton, Button } from '@material-ui/core'

import { singleTokenValidator } from '../../tei-document/attribute-validators'

const fairCopy = window.fairCopy

export default class IDField extends Component {

    constructor(props) {
        super()
        const { value } = props
        this.initialState = {
            valueBuffer: '',
            error: false,
            errorMessage: null,
            editMode: false
        }
        this.state = (value !== null && value !== '') ? { ...this.initialState, ...singleTokenValidator(value) } : this.initialState
    }

    getID() {
        const { editMode, valueBuffer } = this.state
        if( editMode ) {
            return valueBuffer
        } else {
            return this.props.value
        }
    }

    onChange = (e) => {
        const {value} = e.target
        if( value !== null && value !== '' ) {
            const validState = singleTokenValidator(value)
            this.setState( { ...validState, valueBuffer: value } )
        } else {
            const { editMode } = this.state
            this.setState( { ...this.initialState, editMode })
        }
    }

    renderButtonMode() {
        const onClick = () => { this.setState( {...this.state, editMode: true} )}

        return (
            <div className="element-id-field">
                <Button onClick={onClick} >Assign ID</Button>
            </div>    
        ) 
    }

    renderDisplayMode() {
        const value = this.getID()

        const onClick = () => { this.setState( {...this.state, valueBuffer: value, editMode: true} )}

        const onCopy= () => {
            const value = this.getID()
            fairCopy.services.copyToClipBoard(`#${value}`)
        }

        return (
            <div className="element-id-field">
                <Typography onClick={onClick} className="element-id" variant="h5">#{value}</Typography>                 
                <IconButton
                    onClick={onCopy}
                    tooltip="Copy to clipboard."
                >
                    <i className="fa fa-sm fa-clone"></i>
                </IconButton>
            </div>    
        )
    }

    renderEditMode() {
        const value = this.getID()
        const { error, errorMessage } = this.state
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "

        const onSaveClick = () => {
            const { valueBuffer } = this.state
            this.setState({ ...this.initialState })
            this.props.onChangeCallback(valueBuffer,false)
        }

        const onCancelClick = () => { this.setState({ ...this.initialState })}

        return (
            <div className="element-id-field">
                <TextField
                    label="xml:id"
                    value={value}                        
                    fullWidth={true}
                    onChange={this.onChange}
                    error={error}
                    helperText={helperText}
                />
                <IconButton 
                    onClick={onSaveClick} 
                    disabled={error}
                    tooltip={"Save"}
                >
                    <i className="fas fa-check-circle"></i>
                </IconButton>
                <IconButton 
                    onClick={onCancelClick} 
                    tooltip={"Cancel"}
                >
                    <i className="fas fa-times-circle"></i>
                </IconButton>
            </div>
        )
    }

    render() {
        const { editMode } = this.state
        const value = this.getID()

        if( editMode ) return this.renderEditMode()
        return ( value && value.length > 0 ) ? this.renderDisplayMode() : this.renderButtonMode()
    }
}
