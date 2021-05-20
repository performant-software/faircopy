import React, { Component } from 'react';
import { TextField } from '@material-ui/core'

export default class TEIDataWordLikeField extends Component {

    constructor(props) {
        super()
        const { value, minOccurs, maxOccurs, validator } = props
        this.state = value !== "" && value !== null ? validator(value, minOccurs, maxOccurs) : {}
    }

    onChange = (e) => {
        const {value} = e.target
        const { onChangeCallback, minOccurs, maxOccurs, validator } = this.props
        if( value !== "" && value !== null ) {
            const validState = validator(value, minOccurs, maxOccurs)
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
