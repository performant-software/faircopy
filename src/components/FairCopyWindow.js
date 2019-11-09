import React, { Component } from 'react';
// import { Provider } from 'react-redux'
// import PropTypes from 'prop-types'

// import { dispatchAction } from '../redux-store/ReduxStore';
import TEIEditor from './TEIEditor'

const process = window.nodeAppDependencies.process

export default class FairCopyWindow extends Component {

  componentDidMount() {
    console.log( `Node.js ${process.versions.node}`)
    console.log( `Chromium ${process.versions.chrome}`)
    console.log( `and Electron ${process.versions.electron}`)
  }
  
  render() {
    return (
      // <Provider store={this.props.store}>
          <TEIEditor></TEIEditor>
      // </Provider>
    );  
  }
}

// FairCopyWindow.propTypes = {
// 	store: PropTypes.object.isRequired
// }

// function mapStateToProps(state) {
// 	return {
// 		editor: state.editor
// 	};
// }

// export default connect(mapStateToProps)(FairCopyWindow);