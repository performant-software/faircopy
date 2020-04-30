import React, { Component } from 'react'
import { TextField, IconButton, Chip } from '@material-ui/core'
import { Autocomplete } from '@material-ui/lab'

import { teiDataWordValidator } from '../../tei-document/attribute-validators'

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
                tooltip={"Open Vocab Editor"}
            >
                <i className="fas fa-sm fa-list-alt"></i>
            </IconButton>
        )
    }

    renderInput = (params) => {
        const { error, errorMessage } = this.state
        const { attrName } = this.props
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "

        return (
            <TextField
                {...params}
                label={attrName}
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
                style={{ width: 300 }}
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
                <Chip variant="outlined" label={option} {...getTagProps({ index })} />
            ))
        }

        const { vocab, value } = this.props
        const terms = vocab.map( v => v[0] )
        const values = value.length > 0 ? value.split(' ') : []
        const key = `multiterm-${Date.now()}`

        return (
            <Autocomplete
                multiple
                key={key}
                value={values}
                options={terms}
                onChange={onChange}
                getOptionLabel={(option) => option}
                renderInput={this.renderInput}
                renderTags={renderTags}
                style={{ width: 300 }}
            />   
        )  
    }

    render() {
        const { maxOccurs } = this.props

        return (
            <div style={{ display: 'flex' }}>
                { ( maxOccurs ) ? this.renderMultiTermField() : this.renderSingleTermField() }
                { this.renderVocabButton() } 
            </div>
        )
    }
}