import React, { Component } from 'react';
import { TextField } from '@material-ui/core'

import { singleTokenValidator } from '../../../../model/attribute-validators'

export default class VocabTermField extends Component {

    constructor(props) {
        super()
        const { value } = props
        this.state = value !== "" && value !== null ? singleTokenValidator(value) : {}
    }

    onChange = (e) => {
        const {value} = e.target
        const { vocab, onChangeCallback } = this.props
        if( value !== "" && value !== null ) {
            const validState = singleTokenValidator(value)
            if( !validState.error ) {
                const exists = vocab.find( v => v[0] === value )
                if( exists ) {
                    validState.error = true
                    validState.errorMessage = "Term already exists in this vocab."
                } 
            } 
            this.setState(validState)    
            onChangeCallback(value,validState.error)
        } else {
            this.setState({})
            onChangeCallback(value,false)
        }
    }

    render() {
        const { value } = this.props
        const { error, errorMessage } = this.state
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "

        return (
            <TextField
                label="new term"
                value={value}      
                className="field-input"                  
                fullWidth={true}
                onChange={this.onChange}
                error={error}
                helperText={helperText}
            />
        )
    }
}
