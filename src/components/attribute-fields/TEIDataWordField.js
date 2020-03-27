import React, { Component } from 'react';
import { TextField } from '@material-ui/core'

import { teiDataWordValidator } from '../../tei-document/attribute-validators'

export default class TEIDataWordField extends Component {

    constructor(props) {
        super()
        const { value, minOccurs, maxOccurs } = props
        this.state = value !== "" && value !== null ? teiDataWordValidator(value, minOccurs, maxOccurs) : {}
    }

    onChange = (e) => {
        const {value} = e.target
        const { onChangeCallback, minOccurs, maxOccurs } = this.props
        if( value !== "" && value !== null ) {
            const validState = teiDataWordValidator(value, minOccurs, maxOccurs)
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
                value={value}                        
                fullWidth={true}
                onChange={this.onChange}
                error={error}
                helperText={helperText}
            />
        )
    }
}
