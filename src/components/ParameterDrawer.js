import React, { Component } from 'react';
import { Drawer, TextField } from '@material-ui/core'
import { Node } from "prosemirror-model"
import { NodeSelection } from "prosemirror-state"

export default class ParameterDrawer extends Component {

    constructor() {
        super()
    }

    changeAttributeHandler = ( element, attributeKey ) => {
        return (e) => {
            const {dispatch, editorState} = this.props
            const {tr, selection} = editorState
            const {value} = e.target
            const {pos} = selection.$anchor
            let newAttrs = { ...element.attrs }
            newAttrs[attributeKey] = value
            if( element instanceof Node ) {
                tr.setNodeMarkup(pos, undefined, newAttrs)
                tr.setSelection( NodeSelection.create(tr.doc, pos) )
                dispatch(tr)
            } else {
                // use pos to ..???
                // const nextMark = mark( element.type, newAttrs )
                // tr.removeMark(from,to,element)
                // tr.addMark(from,to,nextMark)
            }
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
                </div>
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
