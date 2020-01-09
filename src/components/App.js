import React, { Component } from 'react'
import MainWindow from './MainWindow'
import NoteWindow from './NoteWindow'
import GraphWindow from './GraphWindow'

export default class App extends Component {
  
  render() {
    const {rootComponent} = window.fairCopy

    if( rootComponent === "MainWindow" ) {
        return (
            <MainWindow></MainWindow>
        )
    } else if( rootComponent === "NoteWindow" ) {
        return (
            <NoteWindow></NoteWindow>
        )
    } else {
      return (
        <GraphWindow></GraphWindow>
      )
    }

  }
}