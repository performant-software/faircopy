import React, { Component } from 'react'
import { TextField, IconButton, Chip } from '@material-ui/core'
import { Autocomplete } from '@material-ui/lab'

import { teiDataWordValidator } from '../../../../model/attribute-validators'

export default class TEIEnumeratedField extends Component {

    constructor(props) {
        super()
        const { value, minOccurs, maxOccurs } = props
        this.state = value && value !== "" ? teiDataWordValidator(value, minOccurs, maxOccurs) : {}
    }

    renderVocabButton() {
        const { valListType } = this.props
        
        if( valListType === 'closed' ) return null

        const onClick = () => {
            const { elementName, attrName, vocabEditorCallback } = this.props
            vocabEditorCallback(elementName,attrName)
        }
    
        return (
            <IconButton 
                onClick={onClick} 
                className="teidata-enumerated-vocab-button"
                tooltip={"Open Vocab Editor"}
            >
                <i className="fas fa-sm fa-list-alt"></i>
            </IconButton>
        )
    }

    renderInput = (params) => {
        const { error, errorMessage } = this.state
        const { attrName, maxOccurs } = this.props
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "
        const variant = (maxOccurs) ? "outlined" : "standard"

        return (
            <TextField
                {...params}
                className="field-input"
                label={attrName}
                InputLabelProps={{disableAnimation: true}}
                variant={variant}
                fullWidth={true}
                error={error}
                helperText={helperText}
            />
        )
    }

    renderSingleTermField() {
        const { vocab, value } = this.props
        const valObj = vocab.find( v => v[0] === value )
        const key = `singleterm-${Date.now()}`

        const onChange = (e, value) => {
            const { onChangeCallback } = this.props
            let val = value ? value[0] : ''
            onChangeCallback(val,false)
        }

        return (
            <Autocomplete
                key={key}
                value={valObj}
                options={vocab}
                onChange={onChange}
                getOptionLabel={(option) => option[0]}
                renderInput={this.renderInput}
            />   
        )    
    }

    renderMultiTermField() {

        const onChange = (e, values) => {
            const { onChangeCallback } = this.props
            const str = values.join(' ')
            onChangeCallback(str,false)
        }

        const renderTags = (values, getTagProps) => {
            return values.map((option, index) => (
                <Chip variant="outlined" style={{maxWidth: 200}} label={option} {...getTagProps({ index })} />
            ))
        }

        const { vocab, value } = this.props
        const terms = vocab.map( v => v[0] )
        const values = value.length > 0 ? value.split(' ') : []
        const key = `multiterm-${Date.now()}`

        return (
            <Autocomplete
                multiple
                disableClearable
                key={key}
                value={values}
                options={terms}
                onChange={onChange}
                getOptionLabel={(option) => option}
                renderInput={this.renderInput}
                renderTags={renderTags}
            />   
        )  
    }

    render() {
        const { maxOccurs, canEditConfig } = this.props

        return (
            <div style={{ display: 'flex' }}>
                { ( maxOccurs ) ? this.renderMultiTermField() : this.renderSingleTermField() }
                { canEditConfig && this.renderVocabButton() } 
            </div>
        )
    }
}