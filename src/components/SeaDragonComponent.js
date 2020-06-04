import React, { Component } from 'react';

export default class SeaDragonComponent extends Component {
  
  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { loadFolio } = this.props
    return <div className="osd-viewer" ref={(el)=> { loadFolio(el) }}></div>
  }
}
