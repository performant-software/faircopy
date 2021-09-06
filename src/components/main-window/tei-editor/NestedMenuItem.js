import React from "react";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import ArrowRight from "@material-ui/icons/ArrowRight";
import ArrowLeft from "@material-ui/icons/ArrowLeft";
import PropTypes from "prop-types";

class NestedMenuItem extends React.Component {
  static propTypes = {
    label: PropTypes.string.isRequired, // The MenuItem text content
    mainMenuOpen: PropTypes.bool.isRequired, // The same variable assigned to main menu 'open' prop
    expandIcon: PropTypes.object, // usually left or right arrow icon
    highlightColor: PropTypes.string, // highlight background color when item is focused
    left: PropTypes.bool, // expand nested menu to the left?
    MenuItemProps: PropTypes.object // e.g. { dense }
  };
  constructor(props) {
    super(props);
    this.state = {
      subMenuOpen: false
    };
    const expandIconSize = this.props.MenuItemProps?.dense
      ? "small"
      : "medium";
    this.expandIcon = this.props.expandIcon ? (
      this.props.expandIcon
    ) : props.left ? (
      <ArrowLeft fontSize={expandIconSize} />
    ) : (
      <ArrowRight fontSize={expandIconSize} />
    );
    this.highlightColor = this.props.highlightColor
      ? this.props.highlightColor
      : "#dddddd";
    this.subMenuRef = React.createRef(null);
    this.nestedMenuRef = React.createRef(null);
  }
  isSubmenuFocused = () => {
    const active = this.nestedMenuRef.current?.ownerDocument?.activeElement;
    for (const child of this.subMenuRef.current?.children ?? []) {
      if (child === active) {
        return true;
      }
    }
    return false;
  };
  handleMouseEnter = (e) => {
    e.stopPropagation();
    this.setState({ subMenuOpen: true });
    this.nestedMenuRef.current.style.backgroundColor = this.highlightColor;
  };
  handleMouseLeave = (e) => {
    this.setState({ subMenuOpen: false });
    this.nestedMenuRef.current.style.backgroundColor = "white";
  };
  handleClick = (e) => {
    e.stopPropagation();
    this.setState({ subMenuOpen: this.state.subMenuOpen ? false : true });
  };
  handleFocus = (evt) => {
    if (evt.target === this.nestedMenuRef.current) {
      this.setState({ subMenuOpen: true });
      this.nestedMenuRef.current.style.backgroundColor = this.highlightColor;
    }
  };
  handleKeyDown = (evt) => {
    const arrowRight = this.props.left ? "ArrowLeft" : "ArrowRight";
    const arrowLeft = this.props.left ? "ArrowRight" : "ArrowLeft";
    const length = this.subMenuRef.current?.children.length;
    if (length && length > 0) {
      // When keyboard nav goes out of bounds, wrap around the current menu
      // and prevent parent menu from receiving the key input
      if (
        evt.target === this.subMenuRef.current?.children[length - 1] &&
        evt.key === "ArrowDown"
      ) {
        evt.stopPropagation();
        if( this.subMenuRef.current && this.subMenuRef.current.children[0] ) this.subMenuRef.current.children[0].focus();
      } else if (
        evt.target === this.subMenuRef.current?.children[0] &&
        evt.key === "ArrowUp"
      ) {
        evt.stopPropagation();
        if( this.subMenuRef.current && this.subMenuRef.current.children[length-1] ) this.subMenuRef.current.children[length-1].focus();
      } else if (this.isSubmenuFocused()) {
        evt.stopPropagation();
      }
    }
    // Handle arrow key directions behaviour
    if (evt.key === arrowRight && !this.isSubmenuFocused()) {
      if (!this.subMenuOpen) {
        this.setState({ subMenuOpen: true });
      }
      if( this.subMenuRef.current && this.subMenuRef.current.children[0] ) this.subMenuRef.current.children[0].focus();
      evt.stopPropagation();
    } else if (
      (evt.key === "ArrowDown" || evt.key === "ArrowUp") &&
      evt.target === this.nestedMenuRef.current
    ) {
      this.setState({ subMenuOpen: false });
      this.nestedMenuRef.current.style.backgroundColor = "white";
    } else if (evt.key === arrowLeft) {
        if( this.subMenuRef.current ) this.subMenuRef.current.focus();
      this.setState({ subMenuOpen: false });
    }
  };
  render() {
    return (
      <MenuItem
        ref={this.nestedMenuRef}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        onClick={this.handleClick}
        onFocus={this.handleFocus}
        // Root element must have a `tabIndex` attribute for keyboard navigation
        tabIndex={-1}
        onKeyDown={this.handleKeyDown}
        style={{ outline: "none", overflow: "hidden" }}
        {...this.props.MenuItemProps}
      >
        {this.props.label}
        {this.expandIcon}
        <Menu
          // set to pointerEvents to none to prevent menu from capturing
          // events meant for child elements
          style={{ pointerEvents: "none", overflow: "none" }}
          onMouseLeave={(evt) => {}}
          anchorEl={this.nestedMenuRef.current}
          getContentAnchorEl={null}
          anchorOrigin={{
            vertical: "top",
            horizontal: this.props.left ? "left" : "right"
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: this.props.left ? "right" : "left"
          }}
          open={this.state.subMenuOpen && this.props.mainMenuOpen}
          onClose={() => {
            this.setState({ subMenuOpen: false });
          }}
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
        >
          <div ref={this.subMenuRef} style={{ pointerEvents: "auto" }}>
            {this.props.children}
          </div>
        </Menu>
      </MenuItem>
    );
  }
}

export default NestedMenuItem;
