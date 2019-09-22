import React, { Component } from 'react';
import { Drawer, TextField } from '@material-ui/core'

export default class ParameterDrawer extends Component {

    renderAtrributes(attrs) {

        // the keys become field labels
        // changes to data here fires off a transaction
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
                        // onChange={handleChange('name')}
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
                    { this.renderAtrributes(element.attrs) }
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
