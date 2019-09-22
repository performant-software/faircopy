import React, { Component } from 'react';
import { Drawer } from '@material-ui/core'

export default class ParameterDrawer extends Component {


    renderElement() {
        const {selection} = this.props 

        let mark, node, element
        if( selection ) {
            const { $anchor } = selection
            const marks = $anchor.marks()
            mark = marks.length > 0 ? marks[0] : null   
            node = selection.node ? selection.node : $anchor.parent
            element = (selection.node) ? node : (mark) ? mark : node
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
                    <div className='drawerBody'>
                        Atrribute Data
                    </div>    
                </div>
            )    
        }
    }

    render() {   
        // TODO
        // When activated, drawer pulls out and focus is given to the first field
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
