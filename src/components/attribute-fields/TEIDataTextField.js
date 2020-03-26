import React, { Component } from 'react';
import { TextField } from '@material-ui/core'

export default class TEIDataTextField extends Component {

    constructor() {
        super()
        this.state = {
            error: false,
            errorMessage: ""
        }	
    }

    onChange = (e) => {
        const {value} = e.target
        const { onChangeCallback } = this.props
        onChangeCallback(value)
    }

    render() {
        const { attrName, value } = this.props
        const { error, errorMessage } = this.state
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "

        return (
            <TextField
                label={attrName}
                value={value}                        
                fullWidth={true}
                onChange={this.onChange}
                error={error}
                helperText={helperText}
            />
        )
    }
}
