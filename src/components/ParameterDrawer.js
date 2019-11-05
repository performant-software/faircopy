import React, { Component } from 'react';
import { TextField } from '@material-ui/core'
import { Button, Fade, FormControl, InputLabel, Select, MenuItem } from '@material-ui/core'
import { Node } from "prosemirror-model"

import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { changeAttribute } from "../tei-document/commands"

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer

export default class ParameterDrawer extends Component {

    changeAttributeHandler = ( element, attributeKey ) => {
        return (e) => {
            const {dispatch, editorState, teiDocument} = this.props
            const { $anchor } = editorState.selection
            let {tr} = editorState
            const {value} = e.target
            if( element instanceof Node && element.type.name === 'note' && attributeKey === 'id') {
                teiDocument.moveSubDocument(element.attrs['id'], value)
            }
            tr = changeAttribute( element, attributeKey, value, $anchor, tr )
            dispatch(tr)
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
        const elementName = element.type.name
        const keys = Object.keys(attrs)
        const {teiDocument} = this.props
        const elementSpec = teiDocument.elementSpecs[elementName]
        const defaultAttrSpec = teiDocument.defaultAttrSpec

        let attrFields = []
        for( const key of keys ) {
            const fieldKey = `attr-${key}`
            const attr = attrs[key] ? attrs[key] : ""
            const attrSpec = (elementSpec.attrs && elementSpec.attrs[key]) ? elementSpec.attrs[key] : defaultAttrSpec
            attrFields.push(
                <div className="attrTextField" key={fieldKey} >
                    { attrSpec.type === 'select' ? 
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

        return ( attrFields ? 
            <div className="attributeFields">
                {attrFields}
            </div> 
            : <Typography>This element has no attributes.</Typography>
        )
    }

    isPhraseLevel( element ) {
        if( !element ) return false
        const name = element.type.name
        return (name === 'hi' || name === 'ref' || name === 'name')
    }

    // renderNoteButton( element ) {

    //     // must be a ref mark
    //     if( element.type.name !== 'ref' ) {
    //         return null
    //     }

    //     const target = element.attrs['target']
        
    //     if( localStorage.getItem(target) ) {
    //         const editNote = () => {
    //             ipcRenderer.send( 'createNoteEditorWindow', target )
    //         }
    
    //         return (
    //             <Button onClick={editNote} variant='contained' tooltip='Edit Note'>Edit Note</Button>
    //         )        

    //     }
    // }

    renderElement(element,key) {
        const { elementSpecs } = this.props.teiDocument
        const name = element.type.name

        return (
            <ExpansionPanel key={key} elevation={2} className="attributePanel" >
                <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${key}-content`}
                    id={`${key}-header`}             
                >
                    <Typography><b>{name}</b>: <i>{elementSpecs[name].docs}</i> </Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails >
                    { this.renderAttributes(element) }
                </ExpansionPanelDetails>
            </ExpansionPanel>            
        )    
    }

    render() {
        const selection = (this.props.editorState) ? this.props.editorState.selection : null 

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
                    if( this.isPhraseLevel(mark) ) {
                        const key = `attr-panel-${count++}`
                        elements.push( this.renderElement(mark,key) )
                    }    
                }     
            }
        }

        return (
            <Fade in={elements.length > 0} >
                <div>
                    { elements }
                </div>
            </Fade>
        )
    }

}
