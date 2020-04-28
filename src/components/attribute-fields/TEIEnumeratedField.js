import React, { Component } from 'react';
import { TextField, IconButton } from '@material-ui/core'
import { Autocomplete } from '@material-ui/lab'

import { teiDataWordValidator } from '../../tei-document/attribute-validators'

export default class TEIEnumeratedField extends Component {

    constructor(props) {
        super()
        const { value, minOccurs, maxOccurs } = props
        this.state = value !== "" && value !== null ? teiDataWordValidator(value, minOccurs, maxOccurs) : {}
    }

    onChange = (e, value) => {
        const { onChangeCallback } = this.props
        let val = value ? value[0] : ''
        onChangeCallback(val,false)
    }

    openVocabEditor = () => {
        const { elementName, attrName, vocabEditorCallback } = this.props
        vocabEditorCallback(elementName,attrName)
    }

    render() {
        const { attrName, value, vocab } = this.props
        const { error, errorMessage } = this.state
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "
        const valObj = vocab.find( v => v[0] === value )

        const renderInput = (params) => <TextField
                                            {...params}
                                            label={attrName}
                                            fullWidth={true}
                                            error={error}
                                            helperText={helperText}
                                        />

        return (
            <div style={{ display: 'flex'}}>
                <Autocomplete
                    value={valObj}
                    options={vocab}
                    onChange={this.onChange}
                    getOptionLabel={(option) => option[0]}
                    renderInput={renderInput}
                    style={{ width: 300 }}
                />               
                <IconButton 
                    onClick={this.openVocabEditor} 
                    tooltip={"Open Vocab Editor"}
                >
                    <i className="fas fa-sm fa-list-alt"></i>
                </IconButton>
            </div>
        )
    }

}
