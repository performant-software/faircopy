import React, { Component } from 'react';
import EditorWindow from './EditorWindow'

class App extends Component {

  componentDidMount() {
    this.editorWindow = new EditorWindow()
  }

  render() {
    const style = { marginBottom: 23 }
    return (
      <div id='editor' style={style}></div>
    );  
  }
}

export default App;
