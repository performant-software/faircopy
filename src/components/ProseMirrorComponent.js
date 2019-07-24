import React, { Component } from 'react';


export default class ProseMirrorComponent extends Component {
  
  focus() {
    if (this.props.editorView) {
      this.props.editorView.focus();
    }
  }

  componentWillUnmount() {
    if (this.props.editorView) {
      this.props.editorView.destroy();
    }
  }

  shouldComponentUpdate() {
    // Note that EditorView manages its DOM itself so we'd rather not mess
    // with it.
    return false;
  }

  render() {
    // Render just an empty div which is then used as a container for an
    // EditorView instance.
    return <div className='ProseMirrorComponment' ref={this.props.createEditorView}  />;
  }
}
