import React, { Component } from 'react';

export default class ProseMirrorComponent extends Component {
  
  focus() {
    const {editorView} = this.props 
    if (editorView) {
      editorView.focus()
    }
  }

  componentWillUnmount() {
    const {editorView,editorViewDestroyed} = this.props 
    if (editorView) {
      editorView.destroy()
      if( editorViewDestroyed ) editorViewDestroyed()
    }
  }

  shouldComponentUpdate() {
    // Note that EditorView manages its DOM itself so we'd rather not mess
    // with it.
    return false
  }

  render() {
    // Render just an empty div which is then used as a container for an
    // EditorView instance.
    const { createEditorView } = this.props
    return <div className='ProseMirrorComponent' ref={ (el) => { createEditorView(el)} }  />
  }
}
