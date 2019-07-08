import React, { Component } from 'react';

export default class EditorGutter extends Component {

    // TODO create a paragraph marker for each paragraph in the 
    // document and calculate the height based on the size 
    // of the paragraph. 

    render() {   
        return (
            <div className='EditorGutter'>
                <div className='paragraph-marker'></div>
            </div>
        ) 
    }
}
