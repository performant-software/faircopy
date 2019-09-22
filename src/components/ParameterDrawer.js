import React, { Component } from 'react';
import { Drawer } from '@material-ui/core'

export default class ParameterDrawer extends Component {

    // TODO
    // When activated, drawer pulls out and focus is given to the first field
    // displays the following fields: id. type. rend?
    // may be minimized
    // header provides descriptive text of the tag.. color coded highlight? 

    render() {   
        const {selection} = this.props 

        let markType = 'NONE', nodeType = 'NONE'
        if( selection ) {
            const { $anchor } = selection
            const marks = $anchor.marks()
            markType = marks.length > 0 ? marks[0].type.name : 'NONE'   
            nodeType = selection.node ? selection.node.type.name : $anchor.parent.type.name
        }

        return (
            <Drawer                  
                className='ParameterDrawer'  
                variant="persistent"
                anchor="bottom"
                open={true}
            >
                <div>Current Mark: {markType} Current Node: {nodeType}</div>

            </Drawer>
        ) 
    }
}
