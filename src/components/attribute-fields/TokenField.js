import React, { Component } from 'react';
import { TextField } from '@material-ui/core'

import { tokenValidator } from '../../tei-document/attribute-validators'

export default class TokenField extends Component {

    constructor(props) {
        super()
        const { value } = props
        this.state = value !== null && value !== '' ? tokenValidator(value) : {}
    }

    onChange = (e) => {
        const {value} = e.target
        const { onChangeCallback } = this.props
        if( value !== null && value !== '' ) {
            const validState = tokenValidator(value)
            this.setState(validState)
            onChangeCallback(value,validState.error)
        } else {
            this.setState({})
            onChangeCallback(value,false)
        }
    }

    render() {
        const { attrName, value } = this.props
        const { error, errorMessage } = this.state
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "

        return (
            <TextField
                label={attrName}
                className="field-input"
                value={value}                        
                fullWidth={true}
                onChange={this.onChange}
                error={error}
                helperText={helperText}
            />
        )
    }
}
