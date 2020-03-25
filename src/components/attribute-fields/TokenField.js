import React, { Component } from 'react';
import { TextField } from '@material-ui/core'

import { tokenValidator } from '../../tei-document/attribute-validators'

export default class TokenField extends Component {

    constructor(props) {
        super()
        this.state = {
            error: false,
            errorMessage: ""
        }	
    }

    onChange = (e) => {
        const {value} = e.target
        const { onChangeCallback } = this.props
        const validState = tokenValidator(value)
        this.setState({...this.state, ...validState })
        onChangeCallback(value)
    }

    render() {
        const { attrName, value } = this.props
        const { error, errorMessage } = this.state

        return (
            <TextField
                label={attrName}
                value={value}                        
                fullWidth={true}
                onChange={this.onChange}
                error={error}
                helperText={errorMessage}
            />
        )
    }
}
