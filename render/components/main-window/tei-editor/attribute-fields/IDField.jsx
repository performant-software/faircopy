import React, { Component } from 'react';
import { TextField, Typography, IconButton, Button } from '@material-ui/core'

import { idValidator } from '../../../../model/attribute-validators'

const fairCopy = window.fairCopy

export default class IDField extends Component {

    constructor(props) {
        super()
        const { preExistingCondition } = props
        this.initialState = {
            valueBuffer: '',
            initialValue: '',
            error: !!preExistingCondition,
            errorMessage: preExistingCondition,
            editMode: false
        }
        this.state = this.initialState
    }

    getID() {
        const { value } = this.props
        const { editMode, initialValue, valueBuffer } = this.state
        if( editMode ) {
            // have to keep initial value because parent component might change selected element
            if( initialValue !== value ) {
                return value
            } else {
                return valueBuffer
            }
        } else {
            return value
        }
    }

    onChange = (e) => {
        const {value} = e.target
        const initialValue = this.props.value 
        if( value !== null && value !== '' ) {
            const validState = idValidator(value)
            this.setState( { ...validState, initialValue, valueBuffer: value } )
        } else {
            const { editMode } = this.state
            this.setState( { ...this.initialState, initialValue, editMode })
        }
    }

    renderButtonMode() {
        const onClick = () => { this.setState( {...this.state, editMode: true} )}

        return (
            <div className="element-id-field">
                <Button variant="outlined" onClick={onClick} >Assign ID</Button>
            </div>    
        ) 
    }

    renderDisplayMode() {
        const {idPrefix, preExistingCondition} = this.props
        const value = this.getID()

        const onClick = () => { this.setState( {...this.state, valueBuffer: value, initialValue: value, editMode: true} )}

        const onCopy= () => {
            const value = this.getID()
            const fullID = idPrefix ? `${idPrefix}#${value}` : `#${value}`
            fairCopy.services.copyToClipBoard(fullID)
        }
        const error = preExistingCondition ? 'error' : ''
        const displayValue = value.length > 0 ? `#${value}` : ''

        return (
            <div className="element-id-field">
                <Typography onClick={onClick} className={`element-id ${error}`} variant="h5">{displayValue}</Typography>        
                { displayValue.length > 0 &&
                    <IconButton
                    onClick={onCopy}
                    tooltip="Copy to clipboard."
                    >
                        <i className="fa fa-sm fa-clone"></i>
                    </IconButton>            
                }         
            </div>    
        )
    }

    renderEditMode() {
        const value = this.getID()
        const { error, errorMessage } = this.state
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "

        const onSaveClick = () => {
            const { hasID } = this.props
            const { valueBuffer } = this.state
            // check for uniqueness
            if( this.props.value !== valueBuffer && valueBuffer.length > 0 && hasID(valueBuffer) ) {
                this.setState( { ...this.state, error: true, errorMessage: 'ID must be unique to the document.'})
            } else {
                this.initialState = { ...this.initialState, error: false, errorMessage: null}
                this.setState({ ...this.initialState })
                this.props.onChangeCallback(valueBuffer,false)    
            }
        }

        const onCancelClick = () => { this.setState({ ...this.initialState })}

        return (
            <div className="element-id-field">
                <TextField
                    label="xml:id"
                    className="field-input"
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
        const { readOnly } = this.props
        const { editMode } = this.state
        const value = this.getID()

        if( readOnly ) {
            return this.renderDisplayMode()
        } else {
            if( editMode ) return this.renderEditMode()
            return ( value && value.length > 0 ) ? this.renderDisplayMode() : this.renderButtonMode()    
        }
    }
}
