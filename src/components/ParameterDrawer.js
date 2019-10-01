import React, { Component } from 'react';
import { Drawer, TextField } from '@material-ui/core'
import { Node } from "prosemirror-model"
import { NodeSelection, TextSelection } from "prosemirror-state"
import { Button } from '@material-ui/core'

import { changeAttribute } from "../tei-document/commands"

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer

export default class ParameterDrawer extends Component {

    changeAttributeHandler = ( element, attributeKey ) => {
        return (e) => {
            const {dispatch, editorState} = this.props
            const { $anchor } = editorState.selection
            let {tr} = editorState
        const {value} = e.target
            tr = changeAttribute( element, attributeKey, value, $anchor, tr )
            dispatch(tr)
        }
    }

    renderAttributes(element) {
        const {attrs} = element
        const keys = Object.keys(attrs)

        if( keys.length === 0 ) {
            return (
                <div className='drawerBody'>
                    This element has no attributes.
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
                        onChange={this.changeAttributeHandler(element,key)}
                    />
                    { this.renderNoteButton(element) }
                </div>
            )
        }        
    }

    renderNoteButton( element ) {
        const {teiDocumentFile} = this.props

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

        } else {
            const newNote = () => {
                const {dispatch, editorState} = this.props
                const { $anchor } = editorState.selection
                let {tr} = editorState
                const subDocID = teiDocumentFile.createSubDocument(document)
                tr = changeAttribute( element, 'target', subDocID, $anchor, tr )
                dispatch(tr)
                ipcRenderer.send( 'createNoteEditorWindow', subDocID )
            }
    
            return (
                <Button onClick={newNote} variant='contained' tooltip='New Note'>New Note</Button>
            )        
        }
    }

    renderElement() {
        const selection = (this.props.editorState) ? this.props.editorState.selection : null 

        let element
        if( selection ) {
            const { $anchor } = selection
            const marks = $anchor.marks()
            let mark = marks.length > 0 ? marks[0] : null   
            element = (selection.node) ? selection.node : (mark) ? mark : $anchor.parent
        }

        if( !element ) {
            return (
                <div>
                    <div className='drawerHeader'>
                        Select an element to inspect its attributes.
                    </div>
                </div>
            )
        } else {
            return (
                <div>
                   <div className='drawerHeader'>
                        {element.type.name} - Documentation for this element.                    
                    </div>
                    { this.renderAttributes(element) }
                </div>
            )    
        }
    }

    render() {   
        // TODO When activated, drawer pulls out and focus is given to the first field
        // may be minimized
        return (
            <Drawer                  
                className='ParameterDrawer'  
                variant="persistent"
                anchor="bottom"
                open={true}
            >
                { this.renderElement() }
            </Drawer>
        )     
    }
}
