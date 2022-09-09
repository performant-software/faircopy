import React, { Component } from 'react'
import { TextField, Chip } from '@material-ui/core'
import { Autocomplete } from '@material-ui/lab'

import { uriValidator } from '../../../../model/attribute-validators'

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
        let error = false
        let errorMessage = ''
        const errorValues = []
        for( const value of values ) {
            const validResult = uriValidator(value)
            if( validResult.error ) {
                if( !error ) {
                    // record the specifics of the first error
                    error = true
                    errorMessage = validResult.errorMessage    
                }
                // record all bad values
                errorValues.push(value)
            }
        }
        return { error, errorMessage, errorValues }
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
                InputLabelProps={{disableAnimation: true}}
                variant={variant}
                fullWidth={true}
                error={error}
                helperText={helperText}
            />
        )
    }

    renderSingleTermField() {
        const { teiDocument, value } = this.props
        const { fairCopyProject, resourceEntry, parentEntry } = teiDocument
        const { idMap } = fairCopyProject
        const IDs = idMap.getRelativeURIList(resourceEntry.localID,parentEntry?.localID)
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

        return (
            <Autocomplete
                freeSolo
                key={key}
                value={value}
                options={IDs}
                onChange={onChange}
                getOptionLabel={(option) => option}
                renderInput={this.renderInput}
            />   
        )    
    }

    valuesToOptions(values) { 
        return values.map(value => { 
            const error = this.state.errorValues ? this.state.errorValues.includes(value) : false
            return { value, error } 
        })
     }

    optionsToValues(options) {
         return options.map( o => o.value ? o.value : o )
    }

    renderMultiTermField() {

        const onChange = (e, selectedOptions) => {
            const { onChangeCallback } = this.props
            const values = this.optionsToValues(selectedOptions)
            const validResult = this.validateValues(values)
            this.setState(validResult)
            const str = values.join(' ')
            onChangeCallback(str,validResult.error)
        }

        const renderTags = (values, getTagProps) => {
            return values.map((option, index) => {
                const color = option.error ? 'red' : 'black'
                return (
                    <Chip variant="outlined" style={{color, maxWidth: 200}} label={option.value} {...getTagProps({ index })} />
                )
            })
        }

        const { teiDocument, value } = this.props
        const { fairCopyProject, resourceEntry, parentEntry } = teiDocument
        const { idMap } = fairCopyProject
        const options = this.valuesToOptions( idMap.getRelativeURIList(resourceEntry.localID, parentEntry?.localID) )
        const values = value.length > 0 ? value.split(' ') : []
        const selectedOptions = this.valuesToOptions( values )
        const key = `multiterm-${Date.now()}`

        return (
            <Autocomplete
                freeSolo
                multiple
                disableClearable
                key={key}
                value={selectedOptions}
                options={options}
                onChange={onChange}
                getOptionLabel={(option) => option.value}
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