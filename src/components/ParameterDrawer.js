import React, { Component } from 'react';
import { TextField } from '@material-ui/core'
import { Button, Fade } from '@material-ui/core'
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
            const {dispatch, editorState, teiDocumentFile} = this.props
            const { $anchor } = editorState.selection
            let {tr} = editorState
            const {value} = e.target
            if( element instanceof Node && element.type.name === 'note' && attributeKey === 'id') {
                teiDocumentFile.moveSubDocument(element.attrs['id'], value)
            }
            tr = changeAttribute( element, attributeKey, value, $anchor, tr )
            dispatch(tr)
        }
    }

    renderAttributes(element) {
        const {attrs} = element
        const keys = Object.keys(attrs)

        // TODO render all the attributes
        if( keys.length === 0 ) {
            return (
                <div className='drawerBody'>
                    <Typography>This element has no attributes.</Typography>
                </div>    
            )
        } else {
            const key = keys[0]
            const attr = attrs[key]
            return (
                <div className='drawerBody'>
                    <TextField
                        id={`attr-${key}`}
                        label={key}
                        value={attr}
                        className="attrTextField"
                        fullWidth={true}
                        onChange={this.changeAttributeHandler(element,key)}
                    />
                </div>
            )
        }        
    }

    isPhraseLevel( element ) {
        if( !element ) return false
        const name = element.type.name
        return (name === 'hi' || name === 'ref' || name === 'note' || name === 'pb' || name === 'name')
    }

    renderNoteButton( element ) {

        // must be a ref mark
        if( element.type.name !== 'ref' ) {
            return null
        }

        const target = element.attrs['target']
        
        if( localStorage.getItem(target) ) {
            const editNote = () => {
                ipcRenderer.send( 'createNoteEditorWindow', target )
            }
    
            return (
                <Button onClick={editNote} variant='contained' tooltip='Edit Note'>Edit Note</Button>
            )        

        }
    }

    renderElement() {
        const { docs } = this.props.teiDocumentFile
        const selection = (this.props.editorState) ? this.props.editorState.selection : null 

        let element, name
        if( selection ) {
            const { $anchor } = selection
            const marks = $anchor.marks()
            let mark = marks.length > 0 ? marks[0] : null   
            element = (selection.node) ? selection.node : (mark) ? mark : $anchor.parent
            name = element.type.name
        }

        const isPhrase = this.isPhraseLevel(element)
        return (
            <Fade in={isPhrase}>
                {isPhrase ? 
                    <ExpansionPanel elevation={2} className="attributePanel" >
                        <ExpansionPanelSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel1a-content"
                            id="panel1a-header"                      
                        >
                        <Typography>{name} - {docs[name]} </Typography>
                        </ExpansionPanelSummary>
                        <ExpansionPanelDetails >
                            { element ? this.renderAttributes(element) : "" }
                        </ExpansionPanelDetails>
                        </ExpansionPanel>            
                : <div></div> }
            </Fade>
        )    
    }

    render() {
        // TODO render all the phrase elements 
        return (
            this.renderElement() 
        )
    }

}
