import React, { Component } from "react";
import { Popper, Button, Paper, Card, CardActions } from "@material-ui/core";

export default class EditingCard extends Component {
  render() {
    const { anchorEl, editing, onSave, onCancel } = this.props;

    if (!editing || !anchorEl) return null;

    const placement = "bottom-start";
    const elevation = 6;

    return (
      <div id="EditingCard">
        <Popper
          className="note-popup"
          placement={placement}
          open={true}
          anchorEl={anchorEl}
          role={undefined}
          disablePortal
        >
          <Paper elevation={elevation}>
            <Card variant="outlined" className="zoneEditor">
              <CardActions>
                <Button
                  className="zone-action"
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={onSave}
                >
                  Save
                </Button>
                <Button
                  className="zone-action"
                  size="small"
                  variant="outlined"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              </CardActions>
            </Card>
          </Paper>
        </Popper>
      </div>
    );
  }
}
