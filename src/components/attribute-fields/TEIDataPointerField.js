import React, { Component } from 'react'
import { TextField, Chip } from '@material-ui/core'
import { Autocomplete } from '@material-ui/lab'

import { uriValidator } from '../../tei-document/attribute-validators'

export default class TEIDataPointerField extends Component {

    constructor(props) {
        super()
        const { value, maxOccurs } = props
 
        if( value && value !== "" ) {
            if( maxOccurs ) {
                const values = value.split(' ')
                this.state = this.validateValues(values)    
            } else {
                this.state = this.validateValues([value])
            }
        } else {
            this.state = {}
        }
    }

    validateValues(values) {
        for( const value of values ) {
            const validResult = uriValidator(value)
            if( validResult.error ) {
                return validResult
            }
        }
        return { error: false, errorMessage: '' }
    }

    renderInput = (params) => {
        const { error, errorMessage } = this.state
        const { attrName, maxOccurs } = this.props
        const helperText = (errorMessage && errorMessage.length > 0 ) ? errorMessage : " "
        const variant = (maxOccurs) ? "outlined" : "standard"

        return (
            <TextField
                {...params}
                label={attrName}
                className="field-input"
                variant={variant}
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
            if( value && value !== "" ) {
                const validResult = this.validateValues([value])
                this.setState(validResult)
                onChangeCallback(value,validResult.error)
            } else {
                this.setState({})
                onChangeCallback(value,false)
            }
        }


        // TODO record input state 
        // const onInputChange = (e,value) => {
        //     this.setState({...this.state, inputValue: value })
        // }

        // const onBlur = () => {
        // }

        return (
            <Autocomplete
                freeSolo
                key={key}
                value={value}
                options={IDs}
                onChange={onChange}
                // onInputChange={onInputChange}
                // onBlur={onBlur}
                getOptionLabel={(option) => option}
                renderInput={this.renderInput}
            />   
        )    
    }

    renderMultiTermField() {

        const onChange = (e, values) => {
            const { onChangeCallback } = this.props
            const validResult = this.validateValues(values)
            this.setState(validResult)
            const str = values.join(' ')
            onChangeCallback(str,validResult.error)
        }

        const renderTags = (values, getTagProps) => {
            return values.map((option, index) => (
                <Chip variant="outlined" style={{maxWidth: 200}} label={option} {...getTagProps({ index })} />
            ))
        }

        const { teiDocument, value } = this.props
        const IDs = teiDocument.getXMLIDs()
        const values = value.length > 0 ? value.split(' ') : []
        const key = `multiterm-${Date.now()}`

        return (
            <Autocomplete
                freeSolo
                multiple
                key={key}
                value={values}
                options={IDs}
                onChange={onChange}
                getOptionLabel={(option) => option}
                renderInput={this.renderInput}
                renderTags={renderTags}
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