import React, { Component } from 'react'
import MainWindow from './MainWindow'
import NoteWindow from './NoteWindow'

export default class App extends Component {
  
  render() {
    if( window.fairCopy.rootComponent === "MainWindow" ) {
        return (
            <MainWindow></MainWindow>
        )
    } else {
        return (
            <NoteWindow></NoteWindow>
        )
    }

  }
}