import React, { Component } from 'react';
import { TextField } from '@material-ui/core'

import { teiDataWordValidator } from '../../tei-document/attribute-validators'

export default class TokenField extends Component {

    constructor() {
        super()
        this.state = {
            error: false,
            errorMessage: ""
        }	
    }

    onChange = (e) => {
        const {value} = e.target
        const { onChangeCallback, minOccurs, maxOccurs } = this.props
        const validState = teiDataWordValidator(value, minOccurs, maxOccurs)
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
