import React, { Component } from 'react';
import EditorWindow from './EditorWindow'

const process = window.nodeAppDependencies.process

export default class App extends Component {

  componentDidMount() {
    console.log( `FairCopy v0.0.1`)
    console.log( `Node.js ${process.versions.node}`)
    console.log( `Chromium ${process.versions.chrome}`)
    console.log( `and Electron ${process.versions.electron}`)
  }
  
  render() {
    return (
      <div>
        <EditorWindow></EditorWindow>
      </div>
    );  
  }
}
