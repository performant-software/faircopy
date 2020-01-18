import React, { Component } from 'react';
import { TextField } from '@material-ui/core'
import { FormControl, InputLabel, Select, MenuItem } from '@material-ui/core'
import { Node } from "prosemirror-model"

import Typography from '@material-ui/core/Typography';

import { changeAttribute } from "../tei-document/commands"

export default class ParameterDrawer extends Component {

    changeAttributeHandler = ( element, attributeKey ) => {
        return (e) => {
            const { teiDocument } = this.props
            const { editorView } = teiDocument
            const { state } = editorView 
            const { $anchor } = state.selection
            let {tr} = state
            const {value} = e.target
            if( element instanceof Node && element.type.name === 'note' && attributeKey === 'id') {
                teiDocument.moveSubDocument(element.attrs['id'], value)
            }
            tr = changeAttribute( element, attributeKey, value, $anchor, tr )
            editorView.dispatch(tr)
        }
    }

    renderSelectField(element,fieldKey,key,attr,attrSpec) {

        const menuOptions = [ <MenuItem key={`${fieldKey}----`} value={""}>{"<none>"}</MenuItem> ]
        for( const option of attrSpec.options ) {
            menuOptions.push( <MenuItem key={`${fieldKey}-${option}`} value={option}>{option}</MenuItem>)
        }

        return (
            <FormControl id={fieldKey}>
                <InputLabel>{key}</InputLabel>
                <Select
                    className="attributeSelectField"
                    value={attr}
                    fullWidth={true}
                    onChange={this.changeAttributeHandler(element,key)}
                >
                    { menuOptions }
                </Select>
            </FormControl>
        )
    }

    renderAttributes(element) {
        const {attrs} = element
        const keys = Object.keys(attrs)
        const {teiSchema} = this.props.teiDocument
        const attrSpecs = teiSchema.attrs

        let attrFields = []
        for( const key of keys ) {
            const fieldKey = `attr-${key}`
            const attr = attrs[key] ? attrs[key] : ""
            const attrSpec = attrSpecs[key]
            if( !attrSpec.hidden ) {
                attrFields.push(
                    <div className="attrTextField" key={fieldKey} >
                        { attrSpec && attrSpec.type === 'select' ? 
                            this.renderSelectField(element,fieldKey,key,attr,attrSpec)
                        :
                            <TextField
                                id={fieldKey}
                                label={key}
                                value={attr}                        
                                fullWidth={true}
                                onChange={this.changeAttributeHandler(element,key)}
                            />
                        }
                    </div>
                )    
            }
        }

        return ( attrFields ? 
            <div className="attributeFields">
                {attrFields}
            </div> 
            : <Typography>This element has no attributes.</Typography>
        )
    }

    renderElement(element,key) {
        const { width } = this.props
        const { elements } = this.props.teiDocument.teiSchema
        const name = element.type.name
        const elementSpec = elements[name]
        const style = { width:width-40 }

        return (
            <div key={key} style={style}>
                <Typography><b>{name}</b>: <i>{elementSpec.desc}</i> </Typography>
                { this.renderAttributes(element) }
            </div>
        )    
    }

    render() {
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        const selection = (editorView) ? editorView.state.selection : null 

        // create a list of the selected phrase level elements 
        let elements = []
        if( selection ) {
            if( selection.node ) {
                elements.push( this.renderElement(selection.node,'attr-panel-node') )
            } else {
                const { $anchor } = selection
                const marks = $anchor.marks()
                let count = 0
                for( const mark of marks ) {
                    const key = `attr-panel-${count++}`
                    elements.push( this.renderElement(mark,key) )
                }     
            }
        }

        return (
            <div id="ParameterDrawer">
                { elements }
            </div>
        )
    }

}
