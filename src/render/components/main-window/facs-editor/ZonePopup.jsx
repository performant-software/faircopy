import React, { Component } from "react";
import {
  Popper,
  Button,
  Paper,
  Card,
  CardContent,
  CardActions,
  TextField,
} from "@material-ui/core";
import IDField from "../tei-editor/attribute-fields/IDField";
import TEIDataPointerField from "../tei-editor/attribute-fields/TEIDataPointerField";
import ReadOnlyField from "../tei-editor/attribute-fields/ReadOnlyField"

export default class ZonePopup extends Component {
  renderEditor() {
    const {
      facsDocument,
      facsID,
      zone,
      onChange,
      onSave,
      onCancel,
      onEdit,
      onErase,
      imageView,
      editing,
      editable
    } = this.props;
    const { id, note, ana } = zone;

    // TODO add delete button when editing
    const onChangeText = (e) => {
      const { name, value } = e.target;
      onChange(name, value, false);
    };
    const onChangeID = (value, error) => onChange("id", value, error);

    const onChangeTax = (value, error) => onChange("ana", value, error);

    return (
      <Card variant="outlined" className="zoneEditor">
        <div className="zone-id">
          <IDField
            readOnly={!editable}
            idPrefix={facsID}
            hasID={facsDocument.hasID}
            value={id}
            onChangeCallback={onChangeID}
          ></IDField>
        </div>
        <CardContent>
          <TextField
            disabled={!editable}
            name="note"
            onChange={onChangeText}
            multiline
            maxRows={4}
            placeholder="Add a note."
            variant="outlined"
            value={note}
          ></TextField>
          { editable ? 
            <TEIDataPointerField
              disabled={!editable}
              elementName={"Taxonomy"}
              attrName={"ana"}
              minOccurs={null}
              maxOccurs={"unbounded"}
              imageView={imageView}
              value={ana}
              onChangeCallback={onChangeTax}
              resourceEntry={facsDocument.resourceEntry}
              parentEntry={facsDocument.parentEntry}
              fairCopyProject={facsDocument.imageViewContext}
            />          
          :
            <div>
              <ReadOnlyField attrName={"ana"} value={ana}></ReadOnlyField>
            </div>
          }
        </CardContent>
        {
          editable ?
            <CardActions>
              <Button size="small" onClick={onErase}>
                <i className={`fas fa-eraser fa-2x`}></i>
              </Button>
              <div className="zoneActions">
                <Button
                  className="zone-action"
                  size="small"
                  variant="contained"
                  color="secondary"
                  onClick={onEdit}
                >
                  Edit
                </Button>
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
              </div>
            </CardActions>
          :
            <CardActions>
              <div className="zoneActions">
                <Button
                  className="zone-action"
                  size="small"
                  variant="outlined"
                  onClick={onCancel}
                >
                  Close
                </Button>
              </div>
            </CardActions>
        }
      </Card>
    );
  }

  render() {
    const { anchorEl, editing } = this.props;

    if (!anchorEl || editing) return null;

    const placement = "bottom-start";
    const elevation = 6;

    return (
      <div id="ZonePopup">
        <Popper
          className="note-popup"
          placement={placement}
          open={true}
          anchorEl={anchorEl}
          role={undefined}
          disablePortal
        >
          <Paper elevation={elevation}>{this.renderEditor()}</Paper>
        </Popper>
      </div>
    );
  }
}
