import React, { Component } from 'react';

export class SplitPaneView extends Component {
  constructor() {
    super();
    // Initialize the splitter
    this.rightPaneMinWidth = 875;
    this.leftPaneMinWidth = 247;
    this.splitFraction = 0.2;
    this.dividerWidth = 4;
    const left = this.splitFraction;
    const right = 1.0 - left;
    this.state = {
      style: {
        gridTemplateColumns: `${left}fr ${this.dividerWidth}px ${right}fr`,
      },
    };

    // event handlers
    this.dragging = false;
    this.activeDivider = 0;
    this.onDrag = this.onDrag.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onEndDrag = this.onEndDrag.bind(this);
    this.updatePaneSize = this.updatePaneSize.bind(this);
  }

  // On drag, update the UI continuously
  onDrag = (e) => {
    if (this.dragging) {
      const whole = window.innerWidth - 2*this.dividerWidth;
      let left_viewWidth;
      let right_viewWidth;
      if (this.activeDivider === 1) {
        left_viewWidth = e.clientX - this.dividerWidth / 2;
        right_viewWidth = whole - left_viewWidth;
      }
      else {
        left_viewWidth = whole*this.splitFraction;
        right_viewWidth = whole - left_viewWidth;
      }
      // Update as long as we're within limits
      if (left_viewWidth >= this.leftPaneMinWidth
        && right_viewWidth >= this.rightPaneMinWidth) {
        this.splitFraction = (whole === 0) ? 0.0 : left_viewWidth / whole;
        // console.log(`left: ${left_viewWidth} right: ${right_viewWidth}`)
        this.updateUI();
      }

      this.updatePaneSize();
    }
  };

  // Drag start: mark it
  onStartDrag = (position) => {
    this.dragging = true;
    this.activeDivider = 1;
  };

  // Drag end
  onEndDrag = (e) => {
    this.dragging = false;
    this.activeDivider = 0;
  };

  // On window resize
  onResize = (e) => {
    this.updatePaneSize();
  };

  // Update the screen with the new split info
  updateUI() {
    const left = this.splitFraction;
    const right = 1.0 - left;
    this.setState({
      ...this.state,
      style: {
        ...this.state.style,
        gridTemplateColumns: `${left}fr ${this.dividerWidth}px ${right}fr`,
      },
    });
  }

  // Update the sizes of the panes
  updatePaneSize() {
    // Record state change
    const left_px = Math.floor(Math.abs(window.innerWidth * this.splitFraction));
    const right_px = Math.floor(window.innerWidth * (1.0 - this.splitFraction));
    // if (this.props.onWidth && left_px >= this.leftPaneMinWidth && right_px >= this.rightPaneMinWidth) {
      this.props.onWidth(left_px, right_px);
    // }
  }

  componentDidMount() {
    this.updateUI();
    window.addEventListener('mousemove', this.onDrag);
    window.addEventListener('mouseup', this.onEndDrag);
    window.addEventListener('resize', this.onResize);

    // Set the default width on mount
    if (this.props.onWidth) {
      const left_px = Math.floor(Math.abs(window.innerWidth * this.splitFraction));
      const right_px = Math.floor(window.innerWidth * (1.0 - this.splitFraction));
      this.props.onWidth(left_px, right_px);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('mouseup', this.onEndDrag);
    window.removeEventListener('resize', this.onResize);
  }

  renderDivider(position) {
    const drawerIconClass = 'drawer-icon fas fa-caret-left fa-2x';

    return (
      <div className={`divider ${position}_divider`} onMouseDown={() => this.onStartDrag(position)}>
        <div className="drawer-button hidden" onClick={this.onDrawerButton}>
          <i className={drawerIconClass}> </i>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="split-pane-view two-pane" style={{ ...this.state.style }}>
        { this.props.leftPane }
        { this.renderDivider('first') }
        { this.props.rightPane }
      </div>
    );
  }
}