import React, { Component } from 'react';
import { TextField } from '@material-ui/core'

import { tokenValidator } from '../../../../model/attribute-validators'

export default class ReadOnlyField extends Component {

    constructor(props) {
        super()
        const { value } = props
        this.state = value !== null && value !== '' ? tokenValidator(value) : {}
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
                error={error}
                disabled={true}
                helperText={helperText}
            />
        )
    }
}
