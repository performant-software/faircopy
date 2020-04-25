import React, { Component } from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@material-ui/core'
import { TextField, IconButton } from '@material-ui/core'

import { teiDataWordValidator } from '../../tei-document/attribute-validators'

export default class TEIEnumeratedField extends Component {

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

    renderClosedVocab() {
        const { attrName, value, valList } = this.props
        const fieldKey = `attr-field-${attrName}`

        const menuOptions = [ <MenuItem key={`${fieldKey}----`} value={""}>{"<none>"}</MenuItem> ]
        for( const val of valList ) {
            const term = val.ident
            menuOptions.push( <MenuItem key={`${fieldKey}-${term}`} value={term}>{term}</MenuItem>)
        }

        return (
            <FormControl id={fieldKey}>
                <InputLabel>{attrName}</InputLabel>
                <Select
                    className="attributeSelectField"
                    value={value}
                    fullWidth={true}
                    onChange={this.onChange}
                >
                    { menuOptions }
                </Select>
            </FormControl>
        )
    }

    openVocabEditor = () => {
        const { elementName, attrName, vocabEditorCallback } = this.props
        vocabEditorCallback(elementName,attrName)
    }

    renderOpenVocab() {
        const { attrName, value } = this.props
        const { error, errorMessage } = this.state
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "

        return (
            <div style={{ display: 'flex'}}>
                <TextField
                    label={attrName}
                    value={value}                        
                    fullWidth={true}
                    onChange={this.onChange}
                    error={error}
                    helperText={helperText}
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

    render() {
        const { valListType } = this.props
        if( valListType === "closed" ) {
            return this.renderClosedVocab()
        } else {
            return this.renderOpenVocab()
        }
    }
}
