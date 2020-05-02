import React, { Component } from 'react'
import { TextField, Chip } from '@material-ui/core'
import { Autocomplete } from '@material-ui/lab'

import { teiDataWordValidator } from '../../tei-document/attribute-validators'

export default class TEIDataPointerField extends Component {

    constructor(props) {
        super()
        const { value, minOccurs, maxOccurs } = props
        this.state = value && value !== "" ? teiDataWordValidator(value, minOccurs, maxOccurs) : {}
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
        const { teiDocument, value } = this.props
        const IDs = teiDocument.getXMLIDs()
        const key = `singleterm-${Date.now()}`

        const onChange = (e, value) => {
            const { onChangeCallback } = this.props
            let val = value ? value : ''
            onChangeCallback(val,false)
        }

        return (
            <Autocomplete
                key={key}
                value={value}
                options={IDs}
                onChange={onChange}
                getOptionLabel={(option) => option}
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

        const { teiDocument, value } = this.props
        const IDs = teiDocument.getXMLIDs()
        const values = value.length > 0 ? value.split(' ') : []
        const key = `multiterm-${Date.now()}`

        return (
            <Autocomplete
                multiple
                key={key}
                value={values}
                options={IDs}
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
            </div>
        )
    }
}