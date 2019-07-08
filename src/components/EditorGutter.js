import React, { Component } from 'react';
import {connect} from 'react-redux';

class EditorGutter extends Component {

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

function mapStateToProps(state) {
	return {
        teiEditor: state.teiEditor,
    };
}

export default connect(mapStateToProps)(EditorGutter);