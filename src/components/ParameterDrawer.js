import React, { Component } from 'react';
import { Drawer } from '@material-ui/core'

export default class ParameterDrawer extends Component {

    // TODO
    // When activated, drawer pulls out and focus is given to the first field
    // displays the following fields: id. type. rend?
    // may be minimized
    // header provides descriptive text of the tag.. color coded highlight? 

    render() {   
        return (
            <Drawer                  
                className='ParameterDrawer'  
                variant="persistent"
                anchor="bottom"
                open={true}
            >
                <div>CONTENTS OF DRAWER</div>

            </Drawer>
        ) 
    }
}
