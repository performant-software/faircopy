import React, { Component } from 'react';
import { TextField, Button } from '@material-ui/core'
import { FormControl, InputLabel, Select, MenuItem } from '@material-ui/core'
import { Node } from "prosemirror-model"

import Typography from '@material-ui/core/Typography'

import AttributeDialog from './AttributeDialog'
import { changeAttribute } from "../tei-document/commands"
import { heatMapColors } from "../tei-document/highlighter"

export default class ParameterDrawer extends Component {

    constructor() {
        super()
        this.state = {
            attributeDialogOpen: false,
            openElementName: null
        }	
    }

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

    renderSelectField(element,fieldKey,key,attr,vocab) {
        const menuOptions = [ <MenuItem key={`${fieldKey}----`} value={""}>{"<none>"}</MenuItem> ]
        for( const term of vocab ) {
            menuOptions.push( <MenuItem key={`${fieldKey}-${term}`} value={term}>{term}</MenuItem>)
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

    renderAttributes(element,attrState,vocabs) {
        const {attrs} = element
        const {teiSchema} = this.props.teiDocument
        const attrSpecs = teiSchema.attrs
        let attrFields = []

        // <i class="fas fa-info-circle"></i>

        for( const key of Object.keys(attrState) ) {
            if( attrState[key].active ) {
                const fieldKey = `attr-${key}`
                const attr = attrs[key] ? attrs[key] : ""
                const attrSpec = attrSpecs[key]
                const vocab = vocabs[key]
                if( !attrSpec.hidden ) {
                    attrFields.push(
                        <div className="attrTextField" key={fieldKey} >
                            { attrSpec && attrSpec.type === 'select' ? 
                                this.renderSelectField(element,fieldKey,key,attr,vocab)
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
        }           

        return ( attrFields.length > 0 ? 
            <div className="attributeFields">
                {attrFields}
            </div> 
            : ""
        )
    }

    renderLegendBox(heatmapLevel) {
        const style = {
            background: heatMapColors[heatmapLevel]
        }

        return (
            <div style={style} className="legend-box"></div>
        )
    }

    renderElement(element,key) {
        const { width, teiDocument } = this.props
        const { elements } = teiDocument.teiSchema
        const name = element.type.name
        const elementSpec = elements[name]
        const style = { width:width-40 }

        const openAttributeDialog = () => {
            this.setState({...this.state, openElementName: name, attributeDialogOpen: true })
        }

        return (
            <div className="element" key={key} style={style}>
                <span>{this.renderLegendBox(0)} <b>{name}</b>: <i>{elementSpec.desc}</i> </span>
                { this.renderAttributes(element,elementSpec.attrState,elementSpec.vocabs) }
                <div>
                    <Button onClick={openAttributeDialog}>Add/Remove Attributes</Button>
                </div>
            </div>
        )    
    }

    render() {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const { attributeDialogOpen, openElementName } = this.state

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

        const onClose = () => {
            this.setState({...this.state, openElementName: null, attributeDialogOpen: false })
        }

        return (
            <div id="ParameterDrawer">
                <div className="header">
                    <Typography>Element Inspector</Typography>
                </div>
                <div className="attribute-list">
                    { elements.length === 0 ? 
                        <Typography>Click on an element to view its attributes.</Typography>
                    : elements
                    }
                </div>
                <AttributeDialog 
                    elementName={openElementName} 
                    teiDocument={teiDocument} 
                    open={attributeDialogOpen} 
                    onClose={onClose} 
                ></AttributeDialog>
            </div>
        )
    }

}
