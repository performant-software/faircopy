import React, { Component } from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@material-ui/core'
import { TextField } from '@material-ui/core'

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

    renderOpenVocab() {
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

    render() {
        const { valListType } = this.props
        if( valListType === "closed" ) {
            return this.renderClosedVocab()
        } else {
            return this.renderOpenVocab()
        }
    }
}

// changeAttributeHandler = ( element, attributeKey ) => {
//     return (value,error) => {
//         const { teiDocument } = this.props
//         const { editorView } = teiDocument
//         const { state } = editorView 
//         const { $anchor } = state.selection
//         let {tr} = state
//         if( element instanceof Node && element.type.name === 'note' && attributeKey === 'id') {
//             teiDocument.moveSubDocument(element.attrs['id'], value)
//         }
//         const nextElement = changeAttribute( element, '__error__', (error === true), $anchor, tr )                
//         changeAttribute( nextElement, attributeKey, value, $anchor, tr )
//         editorView.dispatch(tr)
//     }
// }

// renderSelectField(element,fieldKey,key,attr,vocab) {
//     const menuOptions = [ <MenuItem key={`${fieldKey}----`} value={""}>{"<none>"}</MenuItem> ]
//     for( const term of vocab ) {
//         menuOptions.push( <MenuItem key={`${fieldKey}-${term}`} value={term}>{term}</MenuItem>)
//     }

//     return (
//         <FormControl id={fieldKey}>
//             <InputLabel>{key}</InputLabel>
//             <Select
//                 className="attributeSelectField"
//                 value={attr}
//                 fullWidth={true}
//                 onChange={this.changeAttributeHandler(element,key)}
//             >
//                 { menuOptions }
//             </Select>
//         </FormControl>
//     )
// }